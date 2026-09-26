import { Provider } from '@prisma/client';
import { AuthService } from '@gitroom/backend/services/auth/auth.service';
import {
  AccessService,
  hashAccessToken,
} from '@gitroom/nestjs-libraries/database/prisma/postmonster-access/access.service';
import { CreateOrgUserDto } from '@gitroom/nestjs-libraries/dtos/auth/create.org.user.dto';
import { randomBytes } from 'crypto';

// API-level registration gating (PRD 6): the real AuthService + real
// AccessService against an in-memory invite store, everything else mocked.
class FakeAccessRepository {
  invites: any[] = [];

  async createInvite(data: any) {
    const row = {
      id: `inv_${this.invites.length + 1}`,
      usedAt: null,
      revokedAt: null,
      createdAt: new Date(),
      accessRequestId: null,
      createdBy: null,
      ...data,
    };
    this.invites.push(row);
    return row;
  }

  async findInviteByTokenHash(tokenHash: string) {
    return this.invites.find((i) => i.tokenHash === tokenHash) || null;
  }

  async consumeInvite(_tx: any, tokenHash: string, email: string) {
    const row = this.invites.find((i) => i.tokenHash === tokenHash);
    if (
      !row ||
      row.email !== email ||
      row.usedAt ||
      row.revokedAt ||
      new Date(row.expiresAt) <= new Date()
    ) {
      return false;
    }
    row.usedAt = new Date();
    return true;
  }

  async findPendingRequestByEmail() {
    return null;
  }
  async createRequest(data: any) {
    return data;
  }
  async getRequestById() {
    return null;
  }
  async listRequests() {
    return { items: [], total: 0, page: 0, limit: 20, hasMore: false };
  }
  async updateRequestStatus() {
    return null;
  }
  async findInviteById() {
    return null;
  }
  async listInvites() {
    return [];
  }
  async revokeInvite() {
    return null;
  }
  async listUsers() {
    return { items: [], total: 0, page: 0, limit: 20, hasMore: false };
  }
}

const makeWorld = () => {
  const accessRepository = new FakeAccessRepository();
  const organization = {
    createOrgAndUser: jest.fn(async (body: any) => ({
      id: 'org_1',
      users: [
        {
          user: {
            id: 'user_1',
            email: body.email,
            password: 'hash',
            providerName: 'LOCAL',
          },
        },
      ],
    })),
    addUserToOrg: jest.fn(async () => ({ id: 'uo_1' })),
    getCount: jest.fn(async () => 1),
  };
  const users = {
    getUserByEmail: jest.fn(async () => null),
    getUserByProvider: jest.fn(async () => null),
  };
  const email = {
    hasProvider: jest.fn(() => true),
    sendEmail: jest.fn(async () => undefined),
    sendEmailSync: jest.fn(async () => undefined),
  };
  const notifications = {};
  const providerInstance = {
    getUser: jest.fn(async () => ({ id: 'google_1', email: 'ada@example.com' })),
    postRegistration: jest.fn(),
  };
  const providerManager = {
    getProvider: jest.fn(() => providerInstance),
  };
  const transaction = {
    model: { $transaction: jest.fn(async (fn: any) => fn({ tx: true })) },
  };

  const accessService = new AccessService(
    accessRepository as any,
    organization as any,
    email as any,
    transaction as any
  );

  const authService = new AuthService(
    users as any,
    organization as any,
    notifications as any,
    email as any,
    providerManager as any,
    accessService
  );

  return {
    authService,
    accessService,
    accessRepository,
    organization,
    users,
    email,
    providerInstance,
    transaction,
  };
};

const makeBody = (over: Partial<CreateOrgUserDto> = {}) => {
  const body = new CreateOrgUserDto();
  body.email = 'ada@example.com';
  body.password = 'supersecret';
  body.company = 'Ada Inc';
  body.provider = Provider.LOCAL;
  body.providerToken = '';
  body.datafast_visitor_id = '';
  return Object.assign(body, over);
};

const issueInvite = async (
  world: ReturnType<typeof makeWorld>,
  email: string,
  over: Partial<{ expiresAt: Date; usedAt: Date; revokedAt: Date }> = {}
) => {
  const token = randomBytes(32).toString('base64url');
  const invite = await world.accessRepository.createInvite({
    email,
    tokenHash: hashAccessToken(token),
    expiresAt: new Date(Date.now() + 86400000),
    ...over,
  });
  return { token, invite };
};

describe('registration with invites (postmonster closed access)', () => {
  const envBackup: Record<string, string | undefined> = {};
  beforeAll(() => {
    for (const key of ['DISABLE_REGISTRATION', 'JWT_SECRET', 'FRONTEND_URL']) {
      envBackup[key] = process.env[key];
    }
    process.env.JWT_SECRET = 'test-secret';
    process.env.FRONTEND_URL = 'https://app.postmonster.xyz';
  });
  afterAll(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      process.env[key] = value;
    }
  });

  beforeEach(() => {
    process.env.DISABLE_REGISTRATION = 'true';
  });

  it('rejects registration without an invite token', async () => {
    const world = makeWorld();
    await expect(
      world.authService.routeAuth(Provider.LOCAL, makeBody(), '1.2.3.4', 'ua')
    ).rejects.toThrow('Registration is disabled');
    expect(world.organization.createOrgAndUser).not.toHaveBeenCalled();
  });

  it('rejects an invite that belongs to a different email', async () => {
    const world = makeWorld();
    const { token } = await issueInvite(world, 'someone-else@example.com');
    await expect(
      world.authService.routeAuth(
        Provider.LOCAL,
        makeBody({ inviteToken: token }),
        '1.2.3.4',
        'ua'
      )
    ).rejects.toThrow('This invite link is invalid or has expired');
    expect(world.organization.createOrgAndUser).not.toHaveBeenCalled();
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1000) }],
    ['already used', { usedAt: new Date() }],
    ['revoked', { revokedAt: new Date() }],
  ])('rejects an %s invite', async (_label, over: any) => {
    const world = makeWorld();
    const { token } = await issueInvite(world, 'ada@example.com', over);
    await expect(
      world.authService.routeAuth(
        Provider.LOCAL,
        makeBody({ inviteToken: token }),
        '1.2.3.4',
        'ua'
      )
    ).rejects.toThrow('This invite link is invalid or has expired');
    expect(world.organization.createOrgAndUser).not.toHaveBeenCalled();
  });

  it('registers with a valid invite and burns it', async () => {
    const world = makeWorld();
    const { token, invite } = await issueInvite(world, 'ada@example.com');

    const result = await world.authService.routeAuth(
      Provider.LOCAL,
      makeBody({ inviteToken: token }),
      '1.2.3.4',
      'ua'
    );

    expect(result.jwt).toBeTruthy();
    expect(invite.usedAt).not.toBeNull();
    expect(world.organization.createOrgAndUser).toHaveBeenCalledTimes(1);
    // creation and consumption share one transaction
    expect(world.transaction.model.$transaction).toHaveBeenCalledTimes(1);
    // the standard activation mail still goes out
    expect(world.email.sendEmail).toHaveBeenCalledWith(
      'ada@example.com',
      'Activate your account',
      expect.stringContaining('/auth/activate/'),
      'top'
    );
  });

  it('a burnt invite cannot register a second user', async () => {
    const world = makeWorld();
    const { token } = await issueInvite(world, 'ada@example.com');
    await world.authService.routeAuth(
      Provider.LOCAL,
      makeBody({ inviteToken: token }),
      '1.2.3.4',
      'ua'
    );

    await expect(
      world.authService.routeAuth(
        Provider.LOCAL,
        makeBody({ inviteToken: token }),
        '1.2.3.4',
        'ua'
      )
    ).rejects.toThrow('This invite link is invalid or has expired');
    expect(world.organization.createOrgAndUser).toHaveBeenCalledTimes(1);
  });

  it('keeps upstream team-invites working (registration into an existing workspace)', async () => {
    const world = makeWorld();
    const result = await world.authService.routeAuth(
      Provider.LOCAL,
      makeBody(),
      '1.2.3.4',
      'ua',
      { orgId: 'org_2', role: 'USER', id: 'team_invite_jwt_id' }
    );

    expect(result.jwt).toBeTruthy();
    expect(world.organization.createOrgAndUser).toHaveBeenCalledTimes(1);
    expect(world.organization.addUserToOrg).toHaveBeenCalledWith(
      'user_1',
      'team_invite_jwt_id',
      'org_2',
      'USER'
    );
  });

  it('closes OAuth sign-up as well', async () => {
    const world = makeWorld();
    await expect(
      world.authService.routeAuth(
        Provider.GOOGLE,
        makeBody({
          provider: Provider.GOOGLE,
          providerToken: 'oauth-token',
          email: 'ada@example.com',
        }),
        '1.2.3.4',
        'ua'
      )
    ).rejects.toThrow('Registration is disabled');
    expect(world.organization.createOrgAndUser).not.toHaveBeenCalled();
  });

  it('leaves open registration alone when DISABLE_REGISTRATION is off', async () => {
    process.env.DISABLE_REGISTRATION = 'false';
    const world = makeWorld();
    const result = await world.authService.routeAuth(
      Provider.LOCAL,
      makeBody(),
      '1.2.3.4',
      'ua'
    );
    expect(result.jwt).toBeTruthy();
    expect(world.organization.createOrgAndUser).toHaveBeenCalledTimes(1);
  });
});
