import { HttpException } from '@nestjs/common';

import { UsersService } from './users.service';

type Mocks = ReturnType<typeof mocks>;

const mocks = () => ({
  usersRepository: {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    getUserWithActiveSubscriptionByEmail: vi.fn(),
    getUserByProvider: vi.fn(),
    switchUserCredentials: vi.fn(),
    deleteAccount: vi.fn(),
    activateUser: vi.fn(),
    updatePassword: vi.fn(),
    getPersonal: vi.fn(),
    changePersonal: vi.fn(),
    getEmailNotifications: vi.fn(),
    updateEmailNotifications: vi.fn(),
  },
  organizationRepository: {
    getImpersonateUser: vi.fn(),
    getOrgsByUserId: vi.fn(async () => [] as any[]),
    getTeam: vi.fn(async () => undefined as any),
    deleteOrganization: vi.fn(),
    deleteTeamMember: vi.fn(),
  },
  integrationRepository: {
    deleteIntegrationsForAccount: vi.fn(),
  },
  notificationService: {
    hasEmailProvider: vi.fn(() => false),
    sendEmail: vi.fn(async () => undefined),
  },
});

const build = (over: Partial<Mocks> = {}) => {
  const m = { ...mocks(), ...over };
  const service = new UsersService(
    m.usersRepository as never,
    m.organizationRepository as never,
    m.integrationRepository as never,
    m.notificationService as never
  );

  return { service, ...m };
};

const org = (id: string, role: string) => ({ id, users: [{ role }] });

describe('UsersService repository delegation', () => {
  it('reads a user by email, id, provider and active subscription', async () => {
    const { service, usersRepository } = build();
    usersRepository.getUserByEmail.mockResolvedValue({ id: 'u1' });
    usersRepository.getUserById.mockResolvedValue({ id: 'u2' });
    usersRepository.getUserByProvider.mockResolvedValue({ id: 'u3' });
    usersRepository.getUserWithActiveSubscriptionByEmail.mockResolvedValue({
      id: 'u4',
    });

    await expect(service.getUserByEmail('a@b.c')).resolves.toEqual({ id: 'u1' });
    await expect(service.getUserById('u2')).resolves.toEqual({ id: 'u2' });
    await expect(
      service.getUserByProvider('pid', 'GENERIC' as never)
    ).resolves.toEqual({ id: 'u3' });
    await expect(
      service.getUserWithActiveSubscriptionByEmail('a@b.c', 'u1')
    ).resolves.toEqual({ id: 'u4' });

    expect(usersRepository.getUserByProvider).toHaveBeenCalledWith(
      'pid',
      'GENERIC'
    );
    expect(
      usersRepository.getUserWithActiveSubscriptionByEmail
    ).toHaveBeenCalledWith('a@b.c', 'u1');
  });

  it('passes personal details, password and notification changes straight through', async () => {
    const { service, usersRepository } = build();

    await service.activateUser('u1');
    await service.updatePassword('u1', 'hashed');
    await service.getPersonal('u1');
    await service.changePersonal('u1', { fullname: 'A' } as never);
    await service.getEmailNotifications('u1');
    await service.updateEmailNotifications('u1', { weekly: true } as never);

    expect(usersRepository.activateUser).toHaveBeenCalledWith('u1');
    expect(usersRepository.updatePassword).toHaveBeenCalledWith('u1', 'hashed');
    expect(usersRepository.changePersonal).toHaveBeenCalledWith('u1', {
      fullname: 'A',
    });
    expect(usersRepository.updateEmailNotifications).toHaveBeenCalledWith('u1', {
      weekly: true,
    });
  });

  it('resolves an impersonation target through the organization repository', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getImpersonateUser.mockResolvedValue([{ id: 'u9' }]);

    await expect(service.getImpersonateUser('nick')).resolves.toEqual([
      { id: 'u9' },
    ]);
    expect(organizationRepository.getImpersonateUser).toHaveBeenCalledWith(
      'nick'
    );
  });
});

describe('UsersService.switchUser', () => {
  const swapped = {
    kept: { id: 'acc-1', email: 'kept@example.com' },
    switched: { id: 'acc-2', email: 'switched@example.com' },
  };

  it('returns both sides of the credential swap', async () => {
    const { service, usersRepository } = build();
    usersRepository.switchUserCredentials.mockResolvedValue(swapped);

    await expect(service.switchUser('acc-1', 'acc-2', 'admin')).resolves.toEqual(
      swapped
    );
    expect(usersRepository.switchUserCredentials).toHaveBeenCalledWith(
      'acc-1',
      'acc-2'
    );
  });

  it('notifies both accounts at their new login address', async () => {
    const { service, usersRepository, notificationService } = build();
    usersRepository.switchUserCredentials.mockResolvedValue(swapped);
    notificationService.hasEmailProvider.mockReturnValue(true);

    await service.switchUser('acc-1', 'acc-2', 'admin');

    expect(notificationService.sendEmail).toHaveBeenCalledTimes(2);
    const recipients = notificationService.sendEmail.mock.calls.map(
      ([to]: any[]) => to
    );
    expect(recipients).toEqual(['kept@example.com', 'switched@example.com']);
  });

  it('tells the user their subscription was not moved by the switch', async () => {
    const { service, usersRepository, notificationService } = build();
    usersRepository.switchUserCredentials.mockResolvedValue(swapped);
    notificationService.hasEmailProvider.mockReturnValue(true);

    await service.switchUser('acc-1', 'acc-2', 'admin');

    const [, subject, body] = notificationService.sendEmail.mock.calls[0];
    expect(subject).toBe('Your Postiz login was changed');
    expect(body).toMatch(/subscription and plan were not changed/);
  });

  it('sends nothing when no email provider is configured', async () => {
    const { service, usersRepository, notificationService } = build();
    usersRepository.switchUserCredentials.mockResolvedValue(swapped);
    notificationService.hasEmailProvider.mockReturnValue(false);

    await service.switchUser('acc-1', 'acc-2', 'admin');

    expect(notificationService.sendEmail).not.toHaveBeenCalled();
  });

  it('still resolves when the notification email fails', async () => {
    const { service, usersRepository, notificationService } = build();
    usersRepository.switchUserCredentials.mockResolvedValue(swapped);
    notificationService.hasEmailProvider.mockReturnValue(true);
    notificationService.sendEmail.mockRejectedValue(new Error('smtp down'));

    await expect(service.switchUser('acc-1', 'acc-2', 'admin')).resolves.toEqual(
      swapped
    );
  });
});

describe('UsersService.getOrgsToDeleteForAccount', () => {
  it('keeps only the organizations the account owns', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
      org('member-of', 'USER'),
      org('admin-of', 'ADMIN'),
    ]);

    await expect(service.getOrgsToDeleteForAccount('u1')).resolves.toEqual([
      org('owned', 'SUPERADMIN'),
    ]);
  });

  it('refuses while an owned organization still has other members', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
    ]);
    organizationRepository.getTeam.mockResolvedValue({
      users: [{ user: { id: 'u1' } }, { user: { id: 'someone-else' } }],
    });

    await expect(service.getOrgsToDeleteForAccount('u1')).rejects.toThrow(
      HttpException
    );
    await expect(service.getOrgsToDeleteForAccount('u1')).rejects.toThrow(
      /remove your team members/
    );
  });

  it('allows deletion when the owner is the only member left', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
    ]);
    organizationRepository.getTeam.mockResolvedValue({
      users: [{ user: { id: 'u1' } }],
    });

    await expect(service.getOrgsToDeleteForAccount('u1')).resolves.toEqual([
      org('owned', 'SUPERADMIN'),
    ]);
  });

  it('allows deletion when the organization has no team record', async () => {
    const { service, organizationRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
    ]);
    organizationRepository.getTeam.mockResolvedValue(undefined);

    await expect(service.getOrgsToDeleteForAccount('u1')).resolves.toEqual([
      org('owned', 'SUPERADMIN'),
    ]);
  });
});

describe('UsersService.deleteAccount', () => {
  it('tears down owned organizations and leaves the ones it only belongs to', async () => {
    const { service, organizationRepository, integrationRepository, usersRepository } =
      build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
      org('member-of', 'USER'),
    ]);

    await expect(service.deleteAccount('u1')).resolves.toEqual({
      deletedOrgs: [org('owned', 'SUPERADMIN')],
    });

    expect(
      integrationRepository.deleteIntegrationsForAccount
    ).toHaveBeenCalledWith('owned');
    expect(organizationRepository.deleteOrganization).toHaveBeenCalledWith(
      'owned'
    );
    expect(organizationRepository.deleteTeamMember).toHaveBeenCalledWith(
      'member-of',
      'u1'
    );
    expect(organizationRepository.deleteOrganization).toHaveBeenCalledTimes(1);
    expect(usersRepository.deleteAccount).toHaveBeenCalledWith('u1');
  });

  it('does not touch any organization when a team member blocks the delete', async () => {
    const { service, organizationRepository, integrationRepository, usersRepository } =
      build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('owned', 'SUPERADMIN'),
    ]);
    organizationRepository.getTeam.mockResolvedValue({
      users: [{ user: { id: 'u1' } }, { user: { id: 'other' } }],
    });

    await expect(service.deleteAccount('u1')).rejects.toThrow(
      /remove your team members/
    );

    expect(
      integrationRepository.deleteIntegrationsForAccount
    ).not.toHaveBeenCalled();
    expect(organizationRepository.deleteOrganization).not.toHaveBeenCalled();
    expect(usersRepository.deleteAccount).not.toHaveBeenCalled();
  });

  it('deletes the account even when it owns nothing', async () => {
    const { service, organizationRepository, usersRepository } = build();
    organizationRepository.getOrgsByUserId.mockResolvedValue([
      org('member-of', 'USER'),
    ]);

    await expect(service.deleteAccount('u1')).resolves.toEqual({
      deletedOrgs: [],
    });
    expect(usersRepository.deleteAccount).toHaveBeenCalledWith('u1');
  });
});
