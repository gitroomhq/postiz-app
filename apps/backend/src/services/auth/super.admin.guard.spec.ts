import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminGuard } from './super.admin.guard';

const organizations = { hasSuperAdminUser: vi.fn() };

const guard = () => new SuperAdminGuard(organizations as never);

const context = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) } as never);

beforeEach(() => {
  organizations.hasSuperAdminUser.mockResolvedValue(false);
});

/**
 * Guards the impersonation route (GET /public/v1/users), so a false positive
 * here hands one organization the ability to act as any user.
 */
describe('SuperAdminGuard', () => {
  it('admits an organization that has a super admin', async () => {
    organizations.hasSuperAdminUser.mockResolvedValue(true);

    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).resolves.toBe(true);
    expect(organizations.hasSuperAdminUser).toHaveBeenCalledWith('org-1');
  });

  it('rejects an organization without one', async () => {
    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toMatchObject({ status: 403 });
  });

  it.each([
    ['no org on the request', {}],
    ['a null org', { org: null }],
    ['an undefined org', { org: undefined }],
  ])('rejects %s without consulting the database', async (_label, request) => {
    await expect(guard().canActivate(context(request))).rejects.toMatchObject({
      status: 403,
    });
    expect(organizations.hasSuperAdminUser).not.toHaveBeenCalled();
  });

  it('answers with a bare "Unauthorized", leaking nothing about the org', async () => {
    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toMatchObject({ response: { msg: 'Unauthorized' } });
  });

  it('throws rather than returning false, so Nest cannot fall through', async () => {
    // Returning false would produce a 403 too, but the explicit throw is what
    // pins the response body; this guards against a refactor to `return false`.
    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toBeTruthy();
  });

  it('denies when the lookup itself fails, rather than admitting', async () => {
    // Fail closed: a database blip must not become an open door.
    organizations.hasSuperAdminUser.mockRejectedValue(new Error('db down'));

    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toThrow();
  });

  it('reads the org off the request, not off any parameter', async () => {
    organizations.hasSuperAdminUser.mockResolvedValue(true);

    await guard().canActivate(context({ org: { id: 'org-42' }, params: { id: 'org-1' } }));

    expect(organizations.hasSuperAdminUser).toHaveBeenCalledWith('org-42');
  });
});
