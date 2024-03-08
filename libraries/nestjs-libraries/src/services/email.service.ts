import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

@Injectable()
export class EmailService {
  async sendEmail(to: string, subject: string, html: string) {
    await resend.emails.send({
      from: 'Gitroom <no-reply@gitroom.com>',
      to,
      subject,
      html,
    });
  }
}
