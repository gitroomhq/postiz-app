import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider.interface';
import { ResendEmailProvider } from './resend-provider.service';
import { SendGridEmailProvider } from './send-grid-email.service';
import { PostmarkEmailProvider } from './postmark-provider.service';

@Injectable()
export class EmailProviderFactory {
  constructor(
    private readonly resendEmailProvider: ResendEmailProvider,
    private readonly sendGridEmailProvider: SendGridEmailProvider,
    private readonly postmarkEmailProvider: PostmarkEmailProvider
  ) {}

  createEmailProvider(): EmailProvider {
    const emailProviderType = process.env.EMAIL_PROVIDER || 'resend';

    switch (emailProviderType) {
      case 'resend':
        return this.resendEmailProvider;
      case 'sendgrid':
        return this.sendGridEmailProvider;
      case 'postmark':
        return this.postmarkEmailProvider;
      default:
        throw new Error(`Unsupported email provider: ${emailProviderType}`);
    }
  }
}
