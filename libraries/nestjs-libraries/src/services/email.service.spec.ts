import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@gitroom/helpers/utils/timer', () => ({ timer: vi.fn(async () => {}) }));

import { EmptyProvider } from '@gitroom/nestjs-libraries/emails/empty.provider';
import { NodeMailerProvider } from '@gitroom/nestjs-libraries/emails/node.mailer.provider';
import { ResendProvider } from '@gitroom/nestjs-libraries/emails/resend.provider';
import { timer } from '@gitroom/helpers/utils/timer';
import { EmailService } from './email.service';

const signalWithStart = vi.fn();

const temporal = {
  client: { getRawClient: () => ({ workflow: { signalWithStart } }) },
} as never;

const build = (provider?: string) => {
  if (provider === undefined) {
    delete process.env.EMAIL_PROVIDER;
  } else {
    process.env.EMAIL_PROVIDER = provider;
  }
  return new EmailService(temporal);
};

beforeEach(() => {
  process.env.EMAIL_FROM_ADDRESS = 'noreply@postiz.test';
  process.env.EMAIL_FROM_NAME = 'Postiz';
  process.env.FRONTEND_URL = 'https://app.postiz.test';
});

describe('EmailService.selectProvider', () => {
  it.each([
    ['resend', ResendProvider],
    ['nodemailer', NodeMailerProvider],
  ])('maps %s to its provider', (name, expected) => {
    expect(build(name).emailService).toBeInstanceOf(expected);
  });

  it.each([
    ['an unknown name', 'sendgrid'],
    ['an empty string', ''],
    ['nothing configured', undefined],
    ['the wrong case', 'Resend'],
  ])('falls back to the empty provider for %s', (_label, value) => {
    expect(build(value).emailService).toBeInstanceOf(EmptyProvider);
  });
});

describe('EmailService.hasProvider', () => {
  it('is false only when no real provider was selected', () => {
    expect(build('resend').hasProvider()).toBe(true);
    expect(build('nodemailer').hasProvider()).toBe(true);
    expect(build('sendgrid').hasProvider()).toBe(false);
    expect(build(undefined).hasProvider()).toBe(false);
  });
});

describe('EmailService.sendEmail', () => {
  it('signals one long-lived workflow rather than starting one per email', async () => {
    // workflowId is a constant and the conflict policy is USE_EXISTING, so
    // every email joins the same queue workflow. Starting a new one per email
    // is what this pins against.
    const service = build('resend');

    await service.sendEmail('a@b.test', 'Subject', '<p>hi</p>', 'bottom', 'reply@b.test');

    expect(signalWithStart).toHaveBeenCalledWith('sendEmailWorkflow', {
      taskQueue: 'main',
      workflowId: 'send_email',
      signal: 'sendEmail',
      args: [{ queue: [] }],
      signalArgs: [
        {
          to: 'a@b.test',
          subject: 'Subject',
          html: '<p>hi</p>',
          replyTo: 'reply@b.test',
          addTo: 'bottom',
        },
      ],
      workflowIdConflictPolicy: 'USE_EXISTING',
    });
  });

  it('carries the addTo position through untouched', async () => {
    const service = build('resend');

    await service.sendEmail('a@b.test', 'S', 'H', 'top');

    expect(signalWithStart.mock.calls.at(-1)![1].signalArgs[0]).toMatchObject({
      addTo: 'top',
      replyTo: undefined,
    });
  });
});

describe('EmailService.sendEmailSync', () => {
  const sendOf = (service: EmailService) =>
    vi.spyOn(service.emailService, 'sendEmail');

  it.each([
    ['no at sign', 'not-an-email'],
    ['an empty string', ''],
  ])('refuses to send to %s', async (_label, to) => {
    const service = build('resend');
    const send = sendOf(service);

    await service.sendEmailSync(to, 'S', '<p>h</p>');

    expect(send).not.toHaveBeenCalled();
  });

  it.each(['EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME'])(
    'does nothing when %s is missing',
    async (key) => {
      const service = build('resend');
      const send = sendOf(service);
      delete process.env[key];

      await service.sendEmailSync('a@b.test', 'S', '<p>h</p>');

      expect(send).not.toHaveBeenCalled();
    }
  );

  it('wraps the body in the shell and passes the sender identity', async () => {
    const service = build('resend');
    const send = sendOf(service).mockResolvedValue('ok' as never);

    await service.sendEmailSync('a@b.test', 'My Subject', '<p>body</p>', 'r@b.test');

    expect(send).toHaveBeenCalledTimes(1);
    const [to, subject, html, fromName, fromAddress, replyTo] = send.mock.calls[0];
    expect({ to, subject, fromName, fromAddress, replyTo }).toEqual({
      to: 'a@b.test',
      subject: 'My Subject',
      fromName: 'Postiz',
      fromAddress: 'noreply@postiz.test',
      replyTo: 'r@b.test',
    });
    expect(html).toContain('<p>body</p>');
    expect(html).toContain('My Subject');
    expect(html).toContain('Postiz');
    expect(html).toContain('https://app.postiz.test/settings');
  });

  it('retries three times before giving up', async () => {
    const service = build('resend');
    const send = sendOf(service).mockRejectedValue(new Error('smtp down'));

    await expect(
      service.sendEmailSync('a@b.test', 'S', '<p>h</p>')
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(3);
    expect(timer).toHaveBeenCalledTimes(2);
    expect(timer).toHaveBeenCalledWith(700);
  });

  it('stops as soon as an attempt succeeds', async () => {
    const service = build('resend');
    const send = sendOf(service)
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok' as never);

    await service.sendEmailSync('a@b.test', 'S', '<p>h</p>');

    expect(send).toHaveBeenCalledTimes(2);
    expect(timer).toHaveBeenCalledTimes(1);
  });

  it('never throws, so a failed email cannot fail its caller', async () => {
    // Callers are register, invite and notification paths that must not 500
    // because the mail provider is down.
    const service = build('resend');
    sendOf(service).mockRejectedValue(new Error('hard failure'));

    await expect(
      service.sendEmailSync('a@b.test', 'S', '<p>h</p>')
    ).resolves.toBeUndefined();
  });

  it('still goes through the empty provider, which only logs', async () => {
    const service = build(undefined);
    const send = sendOf(service);

    await service.sendEmailSync('a@b.test', 'S', '<p>h</p>');

    expect(send).toHaveBeenCalledTimes(1);
  });
});
