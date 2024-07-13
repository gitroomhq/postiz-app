import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_132');

@Injectable()
export class EmailService {
  async sendEmail(to: string, subject: string, html: string) {
    if (!process.env.RESEND_API_KEY) {
      console.log('No Resend API Key found, skipping email sending');
      return;
    }
    const sends = await resend.emails.send({
      from: process.env.IS_GENERAL === 'true' ? 'Nevo <nevo@postiz.com>' : 'Nevo <nevo@gitroom.com>',
      to,
      subject,
      html,
    });

    console.log(sends);
  }
}
