import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email-providers/email.provider.interface';
import { EmailProviderFactory } from './email-providers/email.provider.factory';


@Injectable()
export class EmailService {
  private emailProvider: EmailProvider;

  constructor(private readonly emailProviderFactory: EmailProviderFactory) {
    this.emailProvider = this.emailProviderFactory.createEmailProvider();
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.RESEND_API_KEY || !process.env.SENDGRID_API_KEY || !process.env.POSTMARK_API_KEY) {
      console.log('No Resend API Key found, skipping email sending');
      return;
    }
    await this.emailProvider.sendEmail(to, subject, html);
  }
}
