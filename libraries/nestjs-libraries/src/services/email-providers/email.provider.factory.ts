import { Injectable } from '@nestjs/common';
import { EmailProvider } from './email.provider.interface';
import { ResendEmailProvider } from './resend-provider.service';
import { SendGridEmailProvider } from './send-grid-email.service';
import { PostmarkEmailProvider } from './postmark-provider.service';


@Injectable()
export class EmailProviderFactory {
  createEmailProvider(): EmailProvider {
    const emailProviderType = process.env.EMAIL_PROVIDER || 'resend';
    
    switch (emailProviderType) {
      case 'resend':
        return new ResendEmailProvider(process.env.RESEND_API_KEY || 're_132');

      case 'sendgrid':
        return new SendGridEmailProvider(process.env.SENDGRID_API_KEY || '');

      case 'postmark':
        return new PostmarkEmailProvider(process.env.POSTMARK_API_KEY || '');

      default:
        throw new Error(`Unsupported email provider: ${emailProviderType}`);
    }
  }
}
