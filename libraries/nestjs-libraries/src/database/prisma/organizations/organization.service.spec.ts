import { HttpException } from '@nestjs/common';

import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { OrganizationService } from './organization.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  organizationRepository: {
    createOrgAndUser: vi.fn(),
    getCount: vi.fn(),
    createMaxUser: vi.fn(),
    addUserToOrg: vi.fn(async () => ({ id: 'membership' } as any)),
    getOrgById: vi.fn(),
    getOrgByIdWithSubscription: vi.fn(),
    getOrgByApiKey: vi.fn(),
    getSuperAdminUser: vi.fn(),
    getUserOrg: vi.fn(),
    getOrgsByUserId: vi.fn(async () => [] as any[]),
    getUserOrgByOrganization: vi.fn(),
    updateApiKey: vi.fn(),
    getTeam: vi.fn(),
    setStreak: vi.fn(),
    getOrgByCustomerId: vi.fn(),
    getUsersByEmail: vi.fn(async () => [] as any[]),
    deleteTeamMember: vi.fn(),
    disableOrEnableNonSuperAdminUsers: vi.fn(),
    getShortlinkPreference: vi.fn(),
    updateShortlinkPreference: vi.fn(),
  },
  notificationsService: {
    hasEmailProvider: vi.fn(() => true),
    sendEmail: vi.fn(
      async (_to: string, _subject: string, _html: string) => undefined
    ),
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new OrganizationService(
    m.organizationRepository as never,
    m.notificationsService as never
  );

  return { service, ...m };
};

const orgWithRole = (id: string, role: string) => ({ id, users: [{ role }] });

describe('OrganizationService repository delegation', () => {
  it('tells the repository whether email is configured when creating an org', async () => {
    const { service, organizationRepository, notificationsService } = build();
    notificationsService.hasEmailProvider.mockReturnValue(false);

    await service.createOrgAndUser(
      { email: 'a@b.c' } as never,
      '1.2.3.4',
      'agent'
    );

    expect(organizationRepository.createOrgAndUser).toHaveBeenCalledWith(
      { email: 'a@b.c' },
      false,
      '1.2.3.4',
      'agent'
    );
  });

  it('forwards lookups, streaks and shortlink preferences unchanged', async () => {
    const { service, organizationRepository } = build();

    await service.getCount();
    await service.createMaxUser('id', 'name', 'saas', 'a@b.c');
    await service.addUserToOrg('u1', 'inv', 'org', 'ADMIN');
    await service.getOrgById('org');
    await service.getOrgByIdWithSubscription('org');
    await service.getOrgByApiKey('key');
    await service.getUserOrg('u1');
    await service.getUserOrgByOrganization('u1', 'org');
    await service.updateApiKey('org');
    await service.getTeam('org');
    await service.setStreak('org', 'start');
    await service.getOrgByCustomerId('cus_1');
    await service.disableOrEnableNonSuperAdminUsers('org', true);
    await service.getShortlinkPreference('org');
    await service.updateShortlinkPreference('org', 'DUB' as never);

    expect(organizationRepository.createMaxUser).toHaveBeenCalledWith(
      'id',
      'name',
      'saas',
      'a@b.c'
    );
    expect(organizationRepository.addUserToOrg).toHaveBeenCalledWith(
      'u1',
      'inv',
      'org',
      'ADMIN'
    );
    expect(organizationRepository.setStreak).toHaveBeenCalledWith(
      'org',
      'start'
    );
    expect(
      organizationRepository.disableOrEnableNonSuperAdminUsers
    ).toHaveBeenCalledWith('org', true);
    expect(
      organizationRepository.updateShortlinkPreference
    ).toHaveBeenCalledWith('org', 'DUB');
  });

  it('reduces the super admin lookup to a boolean', async () => {
    const { service, organizationRepository } = build();

    organizationRepository.getSuperAdminUser.mockResolvedValue({ id: 'u1' });
    await expect(service.hasSuperAdminUser('org')).resolves.toBe(true);

    organizationRepository.getSuperAdminUser.mockResolvedValue(null);
    await expect(service.hasSuperAdminUser('org')).resolves.toBe(false);
  });
});

describe('OrganizationService.inviteTeamMember', () => {
  const org = { id: 'org-1', name: 'Acme' } as never;
  const user = { name: 'Dana', email: 'dana@example.com' } as never;

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'test-secret');
    vi.stubEnv('FRONTEND_URL', 'https://app.example.com');
  });

  it('signs the invite payload into the returned url', async () => {
    const { service } = build();

    const { url } = await service.inviteTeamMember(org, user, {
      email: 'new@example.com',
      role: 'USER',
      sendEmail: false,
    } as never);

    expect(url.startsWith('https://app.example.com/?org=')).toBe(true);

    const token = url.split('?org=')[1];
    const payload = AuthService.verifyJWT(token) as Record<string, unknown>;
    expect(payload).toMatchObject({
      email: 'new@example.com',
      role: 'USER',
      orgId: 'org-1',
    });
    expect(payload.timeLimit).toEqual(expect.any(String));
    expect(payload.id).toEqual(expect.any(String));
  });

  it('emails the invitee with the inviter name and organization', async () => {
    const { service, notificationsService } = build();

    await service.inviteTeamMember(org, user, {
      email: 'new@example.com',
      role: 'USER',
      sendEmail: true,
    } as never);

    expect(notificationsService.sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject, body] = notificationsService.sendEmail.mock.calls[0];
    expect(to).toBe('new@example.com');
    expect(subject).toBe('Dana invited you to join "Acme"');
    expect(body).toContain('Dana (dana@example.com)');
    expect(body).toContain('expire in 2 days');
  });

  it('falls back to the email address when the inviter has no name', async () => {
    const { service, notificationsService } = build();

    await service.inviteTeamMember(
      org,
      { email: 'dana@example.com' } as never,
      { email: 'new@example.com', role: 'USER', sendEmail: true } as never
    );

    const [, subject, body] = notificationsService.sendEmail.mock.calls[0];
    expect(subject).toBe('dana@example.com invited you to join "Acme"');
    expect(body).toContain('dana@example.com has invited you');
  });

  it('stays silent when the caller did not ask for an email', async () => {
    const { service, notificationsService } = build();

    await service.inviteTeamMember(org, user, {
      email: 'new@example.com',
      role: 'USER',
      sendEmail: false,
    } as never);

    expect(notificationsService.sendEmail).not.toHaveBeenCalled();
  });
});

describe('OrganizationService.addTeamMemberByEmail', () => {
  const teamOrg = {
    id: 'org-1',
    subscription: { subscriptionTier: 'TEAM' },
  } as never;
  const body = { email: 'new@example.com', role: 'USER' } as never;

  it('rejects a plan without team members', async () => {
    const { service } = build();

    await expect(
      service.addTeamMemberByEmail(
        { id: 'org-1', subscription: { subscriptionTier: 'STANDARD' } } as never,
        body
      )
    ).rejects.toThrow(/plan does not include team members/);
  });

  it('treats a self-hosted organization without stripe as ultimate', async () => {
    const { service, organizationRepository } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', '');
    organizationRepository.getUsersByEmail.mockResolvedValue([{ id: 'u2' }]);

    await expect(
      service.addTeamMemberByEmail({ id: 'org-1' } as never, body)
    ).resolves.toEqual({ added: true });
  });

  it('falls back to the free plan when stripe is configured', async () => {
    const { service } = build();
    vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_123');

    await expect(
      service.addTeamMemberByEmail({ id: 'org-1' } as never, body)
    ).rejects.toThrow(/plan does not include team members/);
  });

  it('rejects an email with no Postiz account', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getUsersByEmail.mockResolvedValue([]);

    await expect(service.addTeamMemberByEmail(teamOrg, body)).rejects.toThrow(
      /No Postiz account found/
    );
  });

  it('refuses when the email maps to several login providers', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getUsersByEmail.mockResolvedValue([
      { id: 'u2' },
      { id: 'u3' },
    ]);

    await expect(service.addTeamMemberByEmail(teamOrg, body)).rejects.toThrow(
      /Multiple accounts exist/
    );
  });

  it('refuses to add a user who is already a member', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getUsersByEmail.mockResolvedValue([{ id: 'u2' }]);
    organizationRepository.getOrgsByUserId.mockResolvedValue([{ id: 'org-1' }]);

    await expect(service.addTeamMemberByEmail(teamOrg, body)).rejects.toThrow(
      /already a member/
    );
    expect(organizationRepository.addUserToOrg).not.toHaveBeenCalled();
  });

  it('surfaces a repository refusal as a bad request', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getUsersByEmail.mockResolvedValue([{ id: 'u2' }]);
    organizationRepository.addUserToOrg.mockResolvedValue(false as never);

    await expect(service.addTeamMemberByEmail(teamOrg, body)).rejects.toThrow(
      HttpException
    );
    await expect(service.addTeamMemberByEmail(teamOrg, body)).rejects.toThrow(
      /Could not add the user/
    );
  });

  it('adds the user with the requested role', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getUsersByEmail.mockResolvedValue([{ id: 'u2' }]);

    await expect(
      service.addTeamMemberByEmail(teamOrg, {
        email: 'new@example.com',
        role: 'ADMIN',
      } as never)
    ).resolves.toEqual({ added: true });

    expect(organizationRepository.addUserToOrg).toHaveBeenCalledWith(
      'u2',
      expect.any(String),
      'org-1',
      'ADMIN'
    );
  });
});

describe('OrganizationService.deleteTeamMember', () => {
  it('refuses when the target does not belong to the organization', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      orgWithRole('other-org', 'USER'),
    ]);

    await expect(
      service.deleteTeamMember(orgWithRole('org-1', 'SUPERADMIN') as never, 'u2')
    ).rejects.toThrow(/not part of this organization/);
  });

  it('refuses to remove someone ranked above the caller', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      orgWithRole('org-1', 'SUPERADMIN'),
    ]);

    await expect(
      service.deleteTeamMember(orgWithRole('org-1', 'ADMIN') as never, 'u2')
    ).rejects.toThrow(/do not have permission/);
    expect(organizationRepository.deleteTeamMember).not.toHaveBeenCalled();
  });

  it('lets an admin remove a plain user', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      orgWithRole('org-1', 'USER'),
    ]);

    await service.deleteTeamMember(
      orgWithRole('org-1', 'ADMIN') as never,
      'u2'
    );

    expect(organizationRepository.deleteTeamMember).toHaveBeenCalledWith(
      'org-1',
      'u2'
    );
  });

  it('lets a caller remove someone of the same rank', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      orgWithRole('org-1', 'ADMIN'),
    ]);

    await service.deleteTeamMember(
      orgWithRole('org-1', 'ADMIN') as never,
      'u2'
    );

    expect(organizationRepository.deleteTeamMember).toHaveBeenCalledWith(
      'org-1',
      'u2'
    );
  });

  it('lets a superadmin remove an admin', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      orgWithRole('org-1', 'ADMIN'),
    ]);

    await service.deleteTeamMember(
      orgWithRole('org-1', 'SUPERADMIN') as never,
      'u2'
    );

    expect(organizationRepository.deleteTeamMember).toHaveBeenCalledWith(
      'org-1',
      'u2'
    );
  });
});
