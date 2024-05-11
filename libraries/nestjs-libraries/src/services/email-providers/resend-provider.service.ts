import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailProvider } from './email.provider.interface';


@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({
      from: 'Gitroom <no-reply@gitroom.com>',
      to,
      subject,
      html,
    });
  }
}
