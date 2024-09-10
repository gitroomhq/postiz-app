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

    if (!process.env.EMAIL_FROM_ADDRESS || !process.env.EMAIL_FROM_NAME) {
      console.log('Email sender information not found in environment variables');
      return;
    }

    console.log('Sending email to', to);
    const sends = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    console.log(sends);
  }
}
