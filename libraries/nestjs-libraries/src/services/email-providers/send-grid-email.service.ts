import { Injectable } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import { EmailProvider } from './email.provider.interface';

@Injectable()
export class SendGridEmailProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const msg = {
      to,
      from: 'Gitroom <no-reply@gitroom.com>',
      subject,
      html,
    };
    await sgMail.send(msg);
  }
}
