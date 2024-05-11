import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider.interface';
import * as postmark from 'postmark';

@Injectable()
export class PostmarkEmailProvider implements EmailProvider {
  private client: postmark.Client;

  constructor(private readonly apiKey: string) {
    this.client = new postmark.Client(apiKey);
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const message = {
      From: 'no-reply@gitroom.com',
      To: to,
      Subject: subject,
      HtmlBody: html,
    };
    await this.client.sendEmail(message);
  }
}