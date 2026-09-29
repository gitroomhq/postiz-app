import { UsersService } from '@gitroom/nestjs-libraries/database/prisma/users/users.service';
import { UsersRepository } from '@gitroom/nestjs-libraries/database/prisma/users/users.repository';

// postmonster: account deletion (PRD 9) - shared workspaces are left (with an
// ownership handover), sole-owner workspaces are deleted in one transaction,
// platform grants are revoked first and media files are cleaned up after

const soleOwnerOrg = {
  id: 'org_sole',
  users: [{ role: 'SUPERADMIN', disabled: false }],
};

const sharedOrg = {
  id: 'org_shared',
  users: [{ role: 'SUPERADMIN', disabled: false }],
};

const memberOrg = {
  id: 'org_member',
  users: [{ role: 'USER', disabled: false }],
};

const teamOf = (orgId: string, memberIds: string[]) => ({
  users: memberIds.map((id) => ({
    role: 'USER',
    user: { id, email: `${id}@example.com` },
  })),
});

describe('UsersService.deleteAccount', () => {
  const build = () => {
    const usersRepository: any = {
      getUserById: jest.fn(async (id: string) => ({
        id,
        email: 'me@example.com',
        deletedAt: null,
      })),
      deleteAccountData: jest.fn(async () => ['/uploads/a.png']),
    };
    const organizationRepository: any = {
      getOrgsByUserId: jest.fn(async () => [soleOwnerOrg, sharedOrg, memberOrg]),
      getTeam: jest.fn(async (orgId: string) => {
        if (orgId === 'org_sole') return teamOf(orgId, ['user_1']);
        if (orgId === 'org_shared') return teamOf(orgId, ['user_1', 'user_2']);
        return teamOf(orgId, ['user_1', 'user_2']);
      }),
    };
    const integrationService: any = {
      revokeTokensForOrg: jest.fn(async () => undefined),
    };
    const notificationService: any = {
      hasEmailProvider: jest.fn(() => false),
      sendEmail: jest.fn(async () => undefined),
    };

    const service = new UsersService(
      usersRepository,
      organizationRepository,
      integrationService,
      notificationService
    );

    return {
      service,
      usersRepository,
      organizationRepository,
      integrationService,
      notificationService,
    };
  };

  it('deletes only the workspaces where the user is the only member', async () => {
    const { service, usersRepository, integrationService } = build();

    const result: any = await service.deleteAccount('user_1');

    expect(usersRepository.deleteAccountData).toHaveBeenCalledWith(
      'user_1',
      ['org_sole'],
      [
        { orgId: 'org_shared', promoteNewOwner: true },
        { orgId: 'org_member', promoteNewOwner: false },
      ]
    );
    // the platform grants of the deleted workspace are revoked, the shared
    // workspaces keep their channels
    expect(integrationService.revokeTokensForOrg).toHaveBeenCalledTimes(1);
    expect(integrationService.revokeTokensForOrg).toHaveBeenCalledWith(
      'org_sole'
    );
    expect(result.deletedOrgIds).toEqual(['org_sole']);
    expect(result.leftOrgIds).toEqual(['org_shared', 'org_member']);
  });

  it('hands ownership over when an owner leaves a shared workspace', async () => {
    const { service, usersRepository } = build();
    await service.deleteAccount('user_1');
    const [, , leaveOrgs] = usersRepository.deleteAccountData.mock.calls[0];
    expect(leaveOrgs.find((o: any) => o.orgId === 'org_shared')).toEqual({
      orgId: 'org_shared',
      promoteNewOwner: true,
    });
    expect(leaveOrgs.find((o: any) => o.orgId === 'org_member')).toEqual({
      orgId: 'org_member',
      promoteNewOwner: false,
    });
  });

  it('rejects deleting an unknown account', async () => {
    const { service, usersRepository } = build();
    usersRepository.getUserById.mockResolvedValue(null);
    await expect(service.deleteAccount('nope')).rejects.toThrow(
      'Account not found'
    );
  });

  it('sends the confirmation email when a provider is configured', async () => {
    const { service, notificationService } = build();
    notificationService.hasEmailProvider.mockReturnValue(true);
    await service.deleteAccount('user_1');
    expect(notificationService.sendEmail).toHaveBeenCalledWith(
      'me@example.com',
      'Your Postmonster account has been deleted',
      expect.stringContaining('deleted')
    );
  });

  it('getOrgsToDeleteForAccount returns only the sole-member workspaces', async () => {
    const { service } = build();
    const orgs = await service.getOrgsToDeleteForAccount('user_1');
    expect(orgs.map((org: any) => org.id)).toEqual(['org_sole']);
  });
});

describe('UsersRepository.deleteAccountData', () => {
  const buildTx = () => {
    const calls: any = {
      postUpdateMany: [],
      mediaUpdateMany: [],
      integrationUpdateMany: [],
      userOrgDeleteMany: [],
      userOrgUpdate: [],
      orgUpdate: [],
      userUpdate: [],
    };

    const tx: any = {
      media: {
        findMany: jest.fn(async () => [{ path: 'https://app/uploads/a.png' }]),
        updateMany: jest.fn(async (args: any) => {
          calls.mediaUpdateMany.push(args);
        }),
      },
      post: {
        findMany: jest.fn(async () => [
          { image: JSON.stringify([{ url: 'https://app/uploads/b.png' }]) },
        ]),
        updateMany: jest.fn(async (args: any) => {
          calls.postUpdateMany.push(args);
        }),
      },
      integration: {
        updateMany: jest.fn(async (args: any) => {
          calls.integrationUpdateMany.push(args);
        }),
      },
      userOrganization: {
        findFirst: jest.fn(async () => ({ id: 'uorg_2', userId: 'user_2' })),
        update: jest.fn(async (args: any) => {
          calls.userOrgUpdate.push(args);
        }),
        deleteMany: jest.fn(async (args: any) => {
          calls.userOrgDeleteMany.push(args);
        }),
      },
      organization: {
        update: jest.fn(async (args: any) => {
          calls.orgUpdate.push(args);
        }),
      },
      user: {
        findUnique: jest.fn(async () => ({
          id: 'user_1',
          email: 'Me@Example.com',
          name: 'Me',
          lastName: null,
          providerId: null,
          deletedAt: null,
        })),
        update: jest.fn(async (args: any) => {
          calls.userUpdate.push(args);
        }),
      },
    };

    const transaction: any = {
      model: {
        $transaction: async (fn: any) => fn(tx),
      },
    };

    const repository = new UsersRepository({} as any, transaction);
    return { repository, tx, calls };
  };

  it('wipes the tokens, hides the rows and anonymizes the user in one transaction', async () => {
    const { repository, calls } = buildTx();

    const files = await repository.deleteAccountData(
      'user_1',
      ['org_sole'],
      [{ orgId: 'org_shared', promoteNewOwner: true }]
    );

    // media files are returned for the post-transaction disk cleanup
    expect(files).toEqual([
      'https://app/uploads/a.png',
      'https://app/uploads/b.png',
    ]);

    // channel tokens are gone from the DB
    expect(calls.integrationUpdateMany[0].data).toMatchObject({
      token: '',
      refreshToken: null,
    });
    expect(calls.integrationUpdateMany[0].where).toEqual({
      organizationId: 'org_sole',
    });

    // the sole-owner workspace is hidden
    expect(calls.orgUpdate[0]).toMatchObject({
      where: { id: 'org_sole' },
    });

    // ownership of the shared workspace goes to the oldest remaining member
    expect(calls.userOrgUpdate[0]).toMatchObject({
      where: { id: 'uorg_2' },
      data: { role: 'SUPERADMIN' },
    });
    expect(calls.userOrgDeleteMany).toEqual([
      { where: { organizationId: 'org_sole' } },
      { where: { organizationId: 'org_shared', userId: 'user_1' } },
    ]);

    // the user row is anonymized and marked deleted
    expect(calls.userUpdate[0].data.email).toMatch(/^deleted_/);
    expect(calls.userUpdate[0].data.deletedAt).toBeInstanceOf(Date);
    expect(calls.userUpdate[0].data.password).toBeNull();
  });
});
