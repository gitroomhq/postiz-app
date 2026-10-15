import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { Organization, User } from '@prisma/client';
import { AddTeamMemberDto } from '@gitroom/nestjs-libraries/dtos/settings/add.team.member.dto';

describe('OrganizationService inviteTeamMember', () => {
  const org = { id: 'org-1', name: 'Acme' } as Organization;
  const user = { name: 'Ada', email: 'ada@example.com' } as User;
  const invitee = 'invitee@example.com';

  let sendEmailSync: jest.Mock;
  let sendEmail: jest.Mock;
  let service: OrganizationService;

  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.example.com';
    process.env.JWT_SECRET = 'test-secret';
    sendEmailSync = jest.fn().mockResolvedValue(undefined);
    sendEmail = jest.fn().mockResolvedValue(undefined);
    service = new OrganizationService(
      {} as any,
      { sendEmail } as any,
      { sendEmailSync } as any
    );
  });

  it('delivers the invite through sendEmailSync and returns the url', async () => {
    const body: AddTeamMemberDto = {
      email: invitee,
      role: 'USER',
      sendEmail: true,
    };

    const result = await service.inviteTeamMember(org, user, body);

    expect(result.url).toContain('https://app.example.com/?org=');
    expect(sendEmailSync).toHaveBeenCalledTimes(1);
    expect(sendEmailSync).toHaveBeenCalledWith(
      invitee,
      'Ada invited you to join "Acme"',
      expect.stringContaining(result.url)
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns the invite url without sending when sendEmail is false', async () => {
    const body: AddTeamMemberDto = {
      email: invitee,
      role: 'USER',
      sendEmail: false,
    };

    const result = await service.inviteTeamMember(org, user, body);

    expect(result.url).toContain('https://app.example.com/?org=');
    expect(sendEmailSync).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('propagates sendEmailSync failures without enqueueing the notification workflow', async () => {
    sendEmailSync.mockRejectedValue(new Error('smtp down'));
    const body: AddTeamMemberDto = {
      email: invitee,
      role: 'USER',
      sendEmail: true,
    };

    await expect(service.inviteTeamMember(org, user, body)).rejects.toThrow(
      'smtp down'
    );
    expect(sendEmailSync).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
