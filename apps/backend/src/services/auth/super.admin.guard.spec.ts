import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SuperAdminGuard } from './super.admin.guard';

const organizations = { canUseSuperAdminApi: vi.fn() };

const guard = () => new SuperAdminGuard(organizations as never);

const context = (request: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => request }) } as never);

beforeEach(() => {
  organizations.canUseSuperAdminApi.mockResolvedValue(false);
});

/**
 * Guards the impersonation route (GET /public/v1/users), so a false positive
 * here hands one organization the ability to act as any user.
 */
describe('SuperAdminGuard', () => {
  it('admits an organization that may use the super admin api', async () => {
    organizations.canUseSuperAdminApi.mockResolvedValue(true);

    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).resolves.toBe(true);
    expect(organizations.canUseSuperAdminApi).toHaveBeenCalledWith('org-1');
  });

  it('rejects an organization that may not', async () => {
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
    expect(organizations.canUseSuperAdminApi).not.toHaveBeenCalled();
  });

  it('answers with a bare "Unauthorized", leaking nothing about the org', async () => {
    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toMatchObject({ response: { msg: 'Unauthorized' } });
  });

  it('throws rather than returning false, so the body is the one above', async () => {
    // A `return false` refactor would still yield 403, but with Nest's default
    // "Forbidden resource" body instead of this one.
    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toMatchObject({ status: 403, response: { msg: 'Unauthorized' } });
  });

  it('denies when the lookup itself fails, rather than admitting', async () => {
    // Fail closed: a database blip must not become an open door.
    organizations.canUseSuperAdminApi.mockRejectedValue(new Error('db down'));

    await expect(
      guard().canActivate(context({ org: { id: 'org-1' } }))
    ).rejects.toThrow();
  });

  it('refuses an OAuth app, even one acting for an organization that qualifies', async () => {
    // A third party app holds a token for the org, not the trust placed in its
    // super admins.
    organizations.canUseSuperAdminApi.mockResolvedValue(true);

    await expect(
      guard().canActivate(context({ org: { id: 'org-1' }, isOAuthApp: true }))
    ).rejects.toMatchObject({ status: 403, response: { msg: 'Unauthorized' } });
    expect(organizations.canUseSuperAdminApi).not.toHaveBeenCalled();
  });

  it('judges the organization that authenticated, not the one being acted on', async () => {
    // The x-postiz-org header swaps `org` for the organization being acted on;
    // it is the caller's own organization that has to be trusted.
    organizations.canUseSuperAdminApi.mockResolvedValue(true);

    await guard().canActivate(
      context({ org: { id: 'target-org' }, authOrgId: 'calling-org' })
    );

    expect(organizations.canUseSuperAdminApi).toHaveBeenCalledWith('calling-org');
  });

  it('reads the org off the request, not off any parameter', async () => {
    organizations.canUseSuperAdminApi.mockResolvedValue(true);

    await guard().canActivate(context({ org: { id: 'org-42' }, params: { id: 'org-1' } }));

    expect(organizations.canUseSuperAdminApi).toHaveBeenCalledWith('org-42');
  });
});
