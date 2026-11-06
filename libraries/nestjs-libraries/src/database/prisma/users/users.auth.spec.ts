import { PrismaClient, User } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mock, mockDeep } from 'jest-mock-extended';
import { Request, Response } from 'express';
import { AuthService as Tokens } from '@gitroom/helpers/auth/auth.service';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import {
  PrismaRepository,
  PrismaService,
  PrismaTransaction,
} from '../prisma.service';
import { OrganizationRepository } from '../organizations/organization.repository';
import { IntegrationRepository } from '../integrations/integration.repository';
import { NotificationService } from '../notifications/notification.service';
import { OrganizationService } from '../organizations/organization.service';
import { AuthMiddleware } from '@gitroom/backend/services/auth/auth.middleware';
import { AuthService as BackendAuthService } from '@gitroom/backend/services/auth/auth.service';
import { EmailService } from '@gitroom/nestjs-libraries/services/email.service';
import { AuthProviderManager } from '@gitroom/backend/services/auth/providers/providers.manager';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { LoginUserDto } from '@gitroom/nestjs-libraries/dtos/auth/login.user.dto';

// These collaborators are irrelevant to the auth flows under test. Avoid
// starting Redis, Temporal, email and external provider clients in this suite.
jest.mock('../organizations/organization.repository', () => ({
  OrganizationRepository: jest.fn(),
}));
jest.mock('../integrations/integration.repository', () => ({
  IntegrationRepository: jest.fn(),
}));
jest.mock('../notifications/notification.service', () => ({
  NotificationService: jest.fn(),
}));
jest.mock('../organizations/organization.service', () => ({
  OrganizationService: jest.fn(),
}));
jest.mock('@gitroom/nestjs-libraries/sentry/initialize.sentry', () => ({
  setSentryUserContext: jest.fn(),
}));
jest.mock('@gitroom/nestjs-libraries/services/email.service', () => ({
  EmailService: jest.fn(),
}));
jest.mock('@gitroom/backend/services/auth/providers/providers.manager', () => ({
  AuthProviderManager: jest.fn(),
}));
jest.mock('@gitroom/nestjs-libraries/newsletter/newsletter.service', () => ({
  NewsletterService: { register: jest.fn().mockResolvedValue(undefined) },
}));

const databaseUrl = process.env.AUTH_TEST_DATABASE_URL;
const databaseTests = databaseUrl ? describe : describe.skip;

databaseTests(
  'persisted user authentication grants (isolated PostgreSQL)',
  () => {
    let db: PrismaClient;
    let users: UsersService;
    let repository: UsersRepository;
    let user: User;
    const originalSecret = process.env.JWT_SECRET;
    const createdUsers: string[] = [];

    beforeAll(() => {
      const url = new URL(databaseUrl!);
      if (
        !['localhost', '127.0.0.1'].includes(url.hostname) ||
        url.pathname !== '/postiz_auth_test' ||
        url.username !== 'f01_test'
      ) {
        throw new Error(
          'Auth tests require a dedicated loopback postiz_auth_test database owned by f01_test'
        );
      }
      process.env.JWT_SECRET = 'isolated-auth-test-key-never-use-in-production';
      db = new PrismaClient({ datasourceUrl: databaseUrl });
      repository = new UsersRepository(
        new PrismaRepository<'user'>(db as PrismaService),
        new PrismaTransaction(db as PrismaService)
      );
      users = new UsersService(
        repository,
        mock<OrganizationRepository>(),
        mock<IntegrationRepository>(),
        mock<NotificationService>()
      );
    });

    beforeEach(async () => {
      user = await db.user.create({
        data: {
          email: `${randomUUID()}@example.invalid`,
          providerName: 'LOCAL',
          timezone: 0,
          password: Tokens.hashPassword('old-test-password'),
          activated: true,
        },
      });
      createdUsers.push(user.id);
    });

    afterAll(async () => {
      if (db) {
        await db.user.deleteMany({ where: { id: { in: createdUsers } } });
        await db.$disconnect();
      }
      if (originalSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = originalSecret;
    });

    it('requires a persisted, unexpired grant in addition to a valid signature', async () => {
      const { token } = Tokens.issueUserToken(user, 'session');
      expect(await users.getUserForAuthToken(token, 'session')).toBeNull();
      const stored = await users.issueAuthToken(user, 'session');
      expect((await users.getUserForAuthToken(stored, 'session'))?.id).toBe(
        user.id
      );
      await db.userAuthToken.update({
        where: { tokenHash: Tokens.userTokenHash(stored) },
        data: { expiresAt: new Date(0) },
      });

      expect(await users.getUserForAuthToken(stored, 'session')).toBeNull();
    });

    it('separates registration, resend, activation, login and forgot-password tokens', async () => {
      const orgs = mock<OrganizationService>();
      const email = mock<EmailService>();
      const backend = new BackendAuthService(
        users,
        orgs,
        email,
        mock<AuthProviderManager>()
      );
      const registrationEmail = `${randomUUID()}@example.invalid`;
      type CreatedOrg = Awaited<
        ReturnType<OrganizationService['createOrgAndUser']>
      >;
      orgs.getCount.mockResolvedValue(0);
      orgs.createOrgAndUser.mockImplementation(async () => {
        const registered = await db.user.create({
          data: {
            email: registrationEmail,
            providerName: 'LOCAL',
            timezone: 0,
            password: Tokens.hashPassword('registration-password'),
            activated: false,
          },
        });
        createdUsers.push(registered.id);
        return mockDeep<CreatedOrg>({
          users: [mockDeep<CreatedOrg['users'][number]>({ user: registered })],
        });
      });
      const registration = Object.assign(new CreateOrgUserDto(), {
        email: registrationEmail,
        password: 'registration-password',
        provider: 'LOCAL',
      });
      const result = await backend.routeAuth('LOCAL', registration, '', '');
      expect(result.jwt).toBeUndefined();
      const activationMail = email.sendEmailSync.mock.calls[0][2];
      const activation = /\/auth\/activate\/([^"<]+)/.exec(activationMail)![1];
      expect(Tokens.verifyUserToken(activation, 'activation').purpose).toBe(
        'activation'
      );
      expect(await users.getUserForAuthToken(activation, 'session')).toBeNull();

      await backend.resendActivationEmail(registrationEmail);
      const resent = /\/auth\/activate\/([^"<]+)/.exec(
        email.sendEmailSync.mock.calls[1][2]
      )![1];
      const session = await backend.activate(resent, '');
      expect(typeof session).toBe('string');
      if (!session) throw new Error('Activation did not return a session');
      expect(
        (await users.getUserForAuthToken(session, 'session'))?.activated
      ).toBe(true);
      expect(await backend.activate(activation, '')).toBe(false);
      await expect(
        backend.resendActivationEmail(registrationEmail)
      ).rejects.toThrow('already activated');

      const login = Object.assign(new LoginUserDto(), {
        email: registrationEmail,
        password: 'registration-password',
        provider: 'LOCAL',
      });
      expect((await backend.routeAuth('LOCAL', login, '', '')).jwt).toEqual(
        expect.any(String)
      );
      await backend.forgot(registrationEmail);
      const resetMail = email.sendEmailSync.mock.calls[2][2];
      const reset = /\/auth\/forgot\/([^"<]+)/.exec(resetMail)![1];
      expect(Tokens.verifyUserToken(reset, 'password-reset').purpose).toBe(
        'password-reset'
      );
      expect(
        await backend.forgotReturn({
          token: reset,
          password: 'replacement-password',
          repeatPassword: 'replacement-password',
        })
      ).toBe(true);
      expect(await users.getUserForAuthToken(session, 'session')).toBeNull();
    });

    it('rejects a reset token at the real session middleware while allowing a session', async () => {
      const orgs = mock<OrganizationService>();
      type Org = Awaited<
        ReturnType<OrganizationService['getOrgsByUserId']>
      >[number];
      orgs.getOrgsByUserId.mockResolvedValue([
        mockDeep<Org>({
          id: 'test-org',
          apiKey: 'test-api-key',
          users: [mockDeep<Org['users'][number]>({ disabled: false })],
        }),
      ]);
      const middleware = new AuthMiddleware(orgs, users);
      const response = mock<Response>();
      const next = jest.fn();
      const reset = await users.issueAuthToken(user, 'password-reset');
      const request = mock<Request>({ headers: { auth: reset }, cookies: {} });
      await expect(middleware.use(request, response, next)).rejects.toThrow(
        'Forbidden'
      );
      expect(next).not.toHaveBeenCalled();
      request.headers.auth = await users.issueAuthToken(user, 'session');
      await middleware.use(request, response, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('consumes a reset once and invalidates every existing session and reset link', async () => {
      const session = await users.issueAuthToken(user, 'session');
      const reset = await users.issueAuthToken(user, 'password-reset');
      const otherReset = await users.issueAuthToken(user, 'password-reset');
      expect(
        await users.resetPasswordWithToken(reset, 'new-test-password')
      ).toBe(true);
      expect(
        await users.resetPasswordWithToken(reset, 'replayed-password')
      ).toBe(false);
      expect(
        await users.resetPasswordWithToken(otherReset, 'another-password')
      ).toBe(false);
      expect(await users.getUserForAuthToken(session, 'session')).toBeNull();
      const updated = await db.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      expect(
        Tokens.comparePassword('new-test-password', updated.password!)
      ).toBe(true);
      const freshSession = await users.issueAuthToken(updated, 'session');
      expect(
        (await users.getUserForAuthToken(freshSession, 'session'))?.id
      ).toBe(user.id);
    });

    it.each([false, true])(
      'allows only one concurrent reset (different links: %s)',
      async (differentLinks) => {
        const first = await users.issueAuthToken(user, 'password-reset');
        const second = differentLinks
          ? await users.issueAuthToken(user, 'password-reset')
          : first;
        const outcomes = await Promise.all([
          users.resetPasswordWithToken(first, 'first-password'),
          users.resetPasswordWithToken(second, 'second-password'),
        ]);
        expect(outcomes.filter(Boolean)).toHaveLength(1);
        const updated = await db.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        expect(
          Tokens.comparePassword(
            outcomes[0] ? 'first-password' : 'second-password',
            updated.password!
          )
        ).toBe(true);
      }
    );

    it('rejects a login issued with stale credentials after a reset', async () => {
      const reset = await users.issueAuthToken(user, 'password-reset');
      expect(await users.resetPasswordWithToken(reset, 'new-password')).toBe(
        true
      );
      const staleSession = await users.issueAuthToken(user, 'session');
      expect(
        await users.getUserForAuthToken(staleSession, 'session')
      ).toBeNull();
    });

    it('rejects expired resets and session/activation tokens at the reset boundary', async () => {
      for (const purpose of ['session', 'activation'] as const) {
        const token = await users.issueAuthToken(user, purpose);
        expect(
          await users.resetPasswordWithToken(token, 'wrong-purpose-password')
        ).toBe(false);
      }
      const reset = await users.issueAuthToken(user, 'password-reset');
      await db.userAuthToken.update({
        where: { tokenHash: Tokens.userTokenHash(reset) },
        data: { expiresAt: new Date(0) },
      });
      expect(
        await users.resetPasswordWithToken(reset, 'expired-password')
      ).toBe(false);
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).password
      ).toBe(user.password);
    });

    it('activates once, rejecting session/reset tokens and replayed activation links', async () => {
      user = await db.user.update({
        where: { id: user.id },
        data: { activated: false },
      });
      for (const purpose of ['session', 'password-reset'] as const) {
        expect(
          await users.activateWithToken(
            await users.issueAuthToken(user, purpose)
          )
        ).toBeNull();
      }
      const activation = await users.issueAuthToken(user, 'activation');
      const outcomes = await Promise.all([
        users.activateWithToken(activation),
        users.activateWithToken(activation),
      ]);
      expect(outcomes.filter(Boolean)).toHaveLength(1);
      expect(outcomes.find(Boolean)?.activated).toBe(true);
      expect(await users.activateWithToken(activation)).toBeNull();
    });

    it('revokes only the logged-out session', async () => {
      const first = await users.issueAuthToken(user, 'session');
      const second = await users.issueAuthToken(user, 'session');
      await users.revokeSession(first);
      expect(await users.getUserForAuthToken(first, 'session')).toBeNull();
      expect((await users.getUserForAuthToken(second, 'session'))?.id).toBe(
        user.id
      );
    });

    it('rolls back password changes when grant invalidation fails', async () => {
      const reset = await users.issueAuthToken(user, 'password-reset');
      // An injected deletion failure inside a real PostgreSQL transaction must
      // not commit the preceding user update.
      const transaction = new PrismaTransaction(db as PrismaService);
      const realTransaction = transaction.model.$transaction.bind(
        transaction.model
      );
      jest
        .spyOn(transaction.model, '$transaction')
        .mockImplementationOnce((callback: unknown) => {
          return realTransaction(async (tx) => {
            jest
              .spyOn(tx.userAuthToken, 'deleteMany')
              .mockRejectedValueOnce(new Error('forced invalidation failure'));
            return (callback as (client: typeof tx) => Promise<boolean>)(tx);
          });
        });
      const failingRepository = new UsersRepository(
        new PrismaRepository<'user'>(db as PrismaService),
        transaction
      );
      await expect(
        failingRepository.consumePasswordReset(
          user,
          Tokens.userTokenHash(reset),
          'must-not-commit'
        )
      ).rejects.toThrow('forced invalidation failure');
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: user.id } })).password
      ).toBe(user.password);
      expect(
        await users.resetPasswordWithToken(reset, 'successful-retry')
      ).toBe(true);
    });
  }
);
