import { Injectable } from '@nestjs/common';
import { ResendService } from '@clickvote/backend/src/shared/mail/providers/resend.api';

@Injectable()
export class MailService {
  constructor(private _resendService: ResendService) {}

  provider() {
    switch (process.env.EMAIL_PROVIDER) {
      case 'resend':
        return this._resendService;
      default:
        console.warn('Invalid Email Provider. Specify a valid email provider');
        break;
    }
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    html: string,
    from = `Clickvote <${process.env.EMAIL}>`
  ) {
    try {
      return this.provider().send(from, to, subject, text, html);
    } catch (err) {
      console.log(`MailServiceError::${err}`);
    }
  }
}
