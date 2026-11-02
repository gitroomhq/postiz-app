import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';

// Without SES_ACCESS_KEY the default AWS credential chain is used
// (AWS_* env vars, ECS task role, EC2 instance profile)
const ses = new SESv2Client({
  region: process.env.SES_REGION,
  ...(process.env.SES_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.SES_ACCESS_KEY,
          secretAccessKey: process.env.SES_SECRET_ACCESS_KEY!,
        },
      }
    : {}),
});

export class SesProvider implements EmailInterface {
  name = 'ses';
  validateEnvKeys = [
    'SES_REGION',
    ...(process.env.SES_ACCESS_KEY ? ['SES_SECRET_ACCESS_KEY'] : []),
  ];
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    emailFromName: string,
    emailFromAddress: string,
    replyTo?: string
  ) {
    // SES only accepts 7-bit ASCII in the From address, so a non-ASCII
    // sender name has to be a MIME encoded-word (RFC 2047)
    const fromName = /^[\x20-\x7e]*$/.test(emailFromName)
      ? `"${emailFromName.replace(/["\\]/g, '\\$&')}"`
      : `=?UTF-8?B?${Buffer.from(emailFromName).toString('base64')}?=`;

    // The SDK throws on API errors (like throttling), so sendEmailSync retries the send
    return ses.send(
      new SendEmailCommand({
        FromEmailAddress: `${fromName} <${emailFromAddress}>`,
        Destination: { ToAddresses: [to] },
        ...(replyTo && { ReplyToAddresses: [replyTo] }),
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
          },
        },
      })
    );
  }
}
