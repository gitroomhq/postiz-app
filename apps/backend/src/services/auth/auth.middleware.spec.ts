import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { HttpForbiddenException } from '@gitroom/nestjs-libraries/services/exception.filter';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';

vi.mock('@gitroom/nestjs-libraries/sentry/initialize.sentry', () => ({
  setSentryUserContext: vi.fn(),
}));

import { AuthMiddleware } from './auth.middleware';

const buildUser = (over: Record<string, unknown> = {}) =>
  ({
    id: 'user-1',
    email: 'user@postiz.test',
    password: 'hashed-password',
    activated: true,
    isSuperAdmin: false,
    ...over,
  }) as never;

const buildOrg = (over: Record<string, unknown> = {}) =>
  ({
    id: 'org-1',
    apiKey: 'existing-api-key',
    paymentId: null,
    users: [{ userId: 'user-1', disabled: false }],
    ...over,
  }) as never;

describe('AuthMiddleware', () => {
  let organizationService: ReturnType<typeof mockDeep<OrganizationService>>;
  let userService: ReturnType<typeof mockDeep<UsersService>>;
  let middleware: AuthMiddleware;
  let next: NextFunction;

  const request = (over: Record<string, unknown> = {}) =>
    ({ headers: {}, cookies: {}, ...over }) as unknown as Request;
  const response = () => ({ cookie: vi.fn(), header: vi.fn() }) as unknown as Response;

  beforeEach(() => {
    organizationService = mockDeep<OrganizationService>();
    userService = mockDeep<UsersService>();
    middleware = new AuthMiddleware(organizationService, userService);
    next = vi.fn();
  });

  it('rejects a request with no auth header and no auth cookie', async () => {
    await expect(
      middleware.use(request(), response(), next)
    ).rejects.toBeInstanceOf(HttpForbiddenException);

    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a token that is not signed with the server secret', async () => {
    await expect(
      middleware.use(request({ headers: { auth: 'not-a-jwt' } }), response(), next)
    ).rejects.toBeInstanceOf(HttpForbiddenException);

    expect(next).not.toHaveBeenCalled();
  });

  it('re-resolves the user from the database and rejects when they are gone', async () => {
    // The token body is never trusted: a validly signed token for a deleted
    // user must not authenticate.
    userService.getUserById.mockResolvedValue(null as never);
    const auth = AuthService.signJWT({ id: 'user-1', activated: true });

    await expect(
      middleware.use(request({ headers: { auth } }), response(), next)
    ).rejects.toBeInstanceOf(HttpForbiddenException);

    expect(userService.getUserById).toHaveBeenCalledWith('user-1');
  });

  it('rejects a user the database says is not activated, whatever the token claims', async () => {
    userService.getUserById.mockResolvedValue(buildUser({ activated: false }));
    const auth = AuthService.signJWT({ id: 'user-1', activated: true });

    await expect(
      middleware.use(request({ headers: { auth } }), response(), next)
    ).rejects.toBeInstanceOf(HttpForbiddenException);
  });

  it('does not honour an impersonate header for a non-superadmin', async () => {
    // The privilege-escalation guard. A forged-but-signed token claiming
    // isSuperAdmin must not grant impersonation, because the flag is read from
    // the freshly-loaded database user rather than from the token.
    userService.getUserById.mockResolvedValue(buildUser({ isSuperAdmin: false }));
    organizationService.getOrgsByUserId.mockResolvedValue([buildOrg()]);
    const auth = AuthService.signJWT({ id: 'user-1', isSuperAdmin: true });

    const req = request({ headers: { auth, impersonate: 'victim-user' } });
    await middleware.use(req, response(), next);

    expect(organizationService.getUserOrg).not.toHaveBeenCalled();
    expect((req as unknown as { user: { id: string } }).user.id).toBe('user-1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('impersonates for a real superadmin and narrows the org to that user', async () => {
    userService.getUserById.mockResolvedValue(buildUser({ isSuperAdmin: true }));
    organizationService.getUserOrg.mockResolvedValue({
      user: buildUser({ id: 'target', email: 'target@postiz.test' }),
      organization: buildOrg({
        users: [
          { userId: 'target', disabled: false },
          { userId: 'someone-else', disabled: false },
        ],
      }),
    } as never);
    const auth = AuthService.signJWT({ id: 'user-1' });

    const req = request({ headers: { auth, impersonate: 'target' } });
    await middleware.use(req, response(), next);

    const applied = req as unknown as {
      user: { id: string; isSuperAdmin: boolean; password?: string };
      org: { users: { userId: string }[] };
    };

    expect(applied.user.id).toBe('target');
    expect(applied.user.isSuperAdmin).toBe(true);
    expect(applied.user.password).toBeUndefined();
    expect(applied.org.users).toEqual([{ userId: 'target', disabled: false }]);
    expect(next).toHaveBeenCalledOnce();
  });

  it('selects the organization named by the showorg header', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([
      buildOrg({ id: 'org-1' }),
      buildOrg({ id: 'org-2' }),
    ]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    const req = request({ headers: { auth, showorg: 'org-2' } });
    await middleware.use(req, response(), next);

    expect((req as unknown as { org: { id: string } }).org.id).toBe('org-2');
  });

  it('falls back to the first organization when showorg matches nothing', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([
      buildOrg({ id: 'org-1' }),
      buildOrg({ id: 'org-2' }),
    ]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    const req = request({ headers: { auth, showorg: 'org-does-not-exist' } });
    await middleware.use(req, response(), next);

    expect((req as unknown as { org: { id: string } }).org.id).toBe('org-1');
  });

  it('ignores organizations where the membership is disabled', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([
      buildOrg({ id: 'disabled-org', users: [{ userId: 'user-1', disabled: true }] }),
      buildOrg({ id: 'active-org' }),
    ]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    const req = request({ headers: { auth } });
    await middleware.use(req, response(), next);

    expect((req as unknown as { org: { id: string } }).org.id).toBe('active-org');
  });

  it('creates an api key lazily, and only when one is missing', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([
      buildOrg({ apiKey: null }),
    ]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    await middleware.use(request({ headers: { auth } }), response(), next);
    expect(organizationService.updateApiKey).toHaveBeenCalledExactlyOnceWith('org-1');

    organizationService.updateApiKey.mockClear();
    organizationService.getOrgsByUserId.mockResolvedValue([buildOrg()]);

    await middleware.use(request({ headers: { auth } }), response(), next);
    expect(organizationService.updateApiKey).not.toHaveBeenCalled();
  });

  it('never exposes the password hash on the request', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([buildOrg()]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    const req = request({ headers: { auth } });
    await middleware.use(req, response(), next);

    expect(
      (req as unknown as { user: { password?: string } }).user.password
    ).toBeUndefined();
  });

  it('accepts the token from a cookie as well as a header', async () => {
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([buildOrg()]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    await middleware.use(request({ cookies: { auth } }), response(), next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects a user who belongs to no enabled organization', async () => {
    // Characterisation of a real defect: the guard is written `if
    // (!organization)` against an array, which is never falsy, so an empty
    // list falls through to `setOrg.apiKey` and throws a TypeError that the
    // catch-all converts into a 403. The user-visible result is correct, but
    // the reason is accidental. See the linked issue before "fixing" this.
    userService.getUserById.mockResolvedValue(buildUser());
    organizationService.getOrgsByUserId.mockResolvedValue([]);
    const auth = AuthService.signJWT({ id: 'user-1' });

    await expect(
      middleware.use(request({ headers: { auth } }), response(), next)
    ).rejects.toBeInstanceOf(HttpForbiddenException);

    expect(next).not.toHaveBeenCalled();
  });
});
