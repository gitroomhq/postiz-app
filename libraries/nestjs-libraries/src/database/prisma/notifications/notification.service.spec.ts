import { beforeEach, describe, expect, it, vi } from 'vitest';

const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));

vi.mock('@gitroom/nestjs-libraries/sentry/logger', () => ({
  logger,
  errorType: (err: unknown) => (err as Error)?.name ?? 'Error',
  errorMessage: (err: unknown) => (err as Error)?.message ?? '',
}));

import { NotificationService } from './notification.service';

const notifications = {
  createNotification: vi.fn(),
  getMainPageCount: vi.fn(),
  getNotifications: vi.fn(),
  getNotificationsPaginated: vi.fn(),
};

const emails = { sendEmail: vi.fn(), hasProvider: vi.fn() };
const organizations = { getAllUsersOrgs: vi.fn() };
const signalWithStart = vi.fn();

const temporal = {
  client: { getRawClient: () => ({ workflow: { signalWithStart } }) },
};

const service = () =>
  new NotificationService(
    notifications as never,
    emails as never,
    organizations as never,
    temporal as never
  );

const member = (over: Record<string, unknown> = {}) => ({
  user: {
    email: 'someone@test',
    sendSuccessEmails: true,
    sendFailureEmails: true,
    ...over,
  },
});

const orgWith = (...users: ReturnType<typeof member>[]) =>
  organizations.getAllUsersOrgs.mockResolvedValue({ users });

beforeEach(() => {
  orgWith(member());
});

describe('NotificationService.inAppNotification', () => {
  it('always records the notification, email or not', async () => {
    await service().inAppNotification('org-1', 'Subject', 'The message');

    expect(notifications.createNotification).toHaveBeenCalledWith(
      'org-1',
      'The message'
    );
  });

  it('sends nothing by default', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg');

    expect(emails.sendEmail).not.toHaveBeenCalled();
    expect(signalWithStart).not.toHaveBeenCalled();
  });

  it('emails the organization when asked to', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg', true);

    expect(emails.sendEmail).toHaveBeenCalledWith(
      'someone@test',
      'Subject',
      'msg',
      'top',
      undefined
    );
  });

  it('records the notification even when the organization has no members', async () => {
    orgWith();

    await service().inAppNotification('org-1', 'Subject', 'msg', true);

    expect(notifications.createNotification).toHaveBeenCalled();
    expect(emails.sendEmail).not.toHaveBeenCalled();
  });

  it('survives an organization lookup that returns nothing', async () => {
    organizations.getAllUsersOrgs.mockResolvedValue(null);

    await expect(
      service().inAppNotification('org-1', 'Subject', 'msg', true)
    ).resolves.toBeUndefined();
    expect(emails.sendEmail).not.toHaveBeenCalled();
  });
});

describe('NotificationService digest routing', () => {
  it('signals one digest workflow per organization instead of emailing', async () => {
    // workflowId is keyed by org and the conflict policy is USE_EXISTING, so
    // a burst of notifications collapses into one digest rather than one mail
    // each.
    await service().inAppNotification('org-1', 'Subject', 'msg', true, true, 'fail');

    expect(emails.sendEmail).not.toHaveBeenCalled();
    expect(signalWithStart).toHaveBeenCalledWith(
      'digestEmailWorkflow',
      expect.objectContaining({
        workflowId: 'digest_email_workflow_org-1',
        signal: 'email',
        taskQueue: 'main',
        workflowIdConflictPolicy: 'USE_EXISTING',
        args: [{ organizationId: 'org-1' }],
      })
    );
  });

  it('carries the subject, message and type into the signal', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg', true, true, 'info');

    expect(signalWithStart.mock.calls[0][1].signalArgs).toEqual([
      [{ title: 'Subject', message: 'msg', type: 'info' }],
    ]);
  });

  it('defaults the type to success', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg', true, true);

    expect(signalWithStart.mock.calls[0][1].signalArgs[0][0].type).toBe('success');
  });

  it('tags the workflow with the organization so it can be found later', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg', true, true);

    expect(
      signalWithStart.mock.calls[0][1].typedSearchAttributes
    ).toBeTruthy();
  });

  it('does not fall back to a direct email when the digest fails', async () => {
    // A Temporal outage must not turn one digest into an email per
    // notification; the notification row is already written either way.
    signalWithStart.mockRejectedValue(new Error('temporal down'));

    await expect(
      service().inAppNotification('org-1', 'Subject', 'msg', true, true)
    ).resolves.toBeUndefined();

    expect(emails.sendEmail).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'workflow_start_failed',
      expect.objectContaining({
        workflow_type: 'digestEmailWorkflow',
        org_id: 'org-1',
      })
    );
  });

  it('ignores digest when no email was requested at all', async () => {
    await service().inAppNotification('org-1', 'Subject', 'msg', false, true);

    expect(signalWithStart).not.toHaveBeenCalled();
  });
});

describe('NotificationService.sendEmailsToOrg preferences', () => {
  it.each([
    ['success', { sendSuccessEmails: false }, false],
    ['success', { sendSuccessEmails: true }, true],
    ['fail', { sendFailureEmails: false }, false],
    ['fail', { sendFailureEmails: true }, true],
  ])('for type %s with %o sends: %s', async (type, prefs, expected) => {
    orgWith(member(prefs));

    await service().sendEmailsToOrg('org-1', 'Subject', 'msg', type as never);

    expect(emails.sendEmail).toHaveBeenCalledTimes(expected ? 1 : 0);
  });

  it('sends an info notification regardless of every preference', async () => {
    // Account and billing notices are "info" precisely so a user cannot opt
    // out of them.
    orgWith(member({ sendSuccessEmails: false, sendFailureEmails: false }));

    await service().sendEmailsToOrg('org-1', 'Subject', 'msg', 'info');

    expect(emails.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('sends when no type is given, because neither gate matches', async () => {
    orgWith(member({ sendSuccessEmails: false, sendFailureEmails: false }));

    await service().sendEmailsToOrg('org-1', 'Subject', 'msg');

    expect(emails.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('respects each member separately', async () => {
    orgWith(
      member({ email: 'wants@test', sendSuccessEmails: true }),
      member({ email: 'optedout@test', sendSuccessEmails: false }),
      member({ email: 'also@test', sendSuccessEmails: true })
    );

    await service().sendEmailsToOrg('org-1', 'Subject', 'msg', 'success');

    expect(emails.sendEmail.mock.calls.map((c) => c[0])).toEqual([
      'wants@test',
      'also@test',
    ]);
  });

  it('does not let a failure preference suppress a success email', async () => {
    orgWith(member({ sendSuccessEmails: true, sendFailureEmails: false }));

    await service().sendEmailsToOrg('org-1', 'Subject', 'msg', 'success');

    expect(emails.sendEmail).toHaveBeenCalledTimes(1);
  });
});

describe('NotificationService pass-throughs', () => {
  it('queues email at the top of the send queue', async () => {
    await service().sendEmail('a@test', 'Subject', '<p>x</p>', 'reply@test');

    expect(emails.sendEmail).toHaveBeenCalledWith(
      'a@test',
      'Subject',
      '<p>x</p>',
      'top',
      'reply@test'
    );
  });

  it('reports whether a provider is configured', () => {
    emails.hasProvider.mockReturnValue(false);
    expect(service().hasEmailProvider()).toBe(false);

    emails.hasProvider.mockReturnValue(true);
    expect(service().hasEmailProvider()).toBe(true);
  });

  it('scopes every read to the organization', () => {
    service().getMainPageCount('org-1', 'user-1');
    service().getNotifications('org-1', 'user-1');
    service().getNotificationsPaginated('org-1', 2);

    expect(notifications.getMainPageCount).toHaveBeenCalledWith('org-1', 'user-1');
    expect(notifications.getNotifications).toHaveBeenCalledWith('org-1', 'user-1');
    expect(notifications.getNotificationsPaginated).toHaveBeenCalledWith('org-1', 2);
  });
});
