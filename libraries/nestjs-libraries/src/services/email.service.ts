import { Injectable } from '@nestjs/common';
import { EmailInterface } from '@gitroom/nestjs-libraries/emails/email.interface';
import { ResendProvider } from '@gitroom/nestjs-libraries/emails/resend.provider';
import { EmptyProvider } from '@gitroom/nestjs-libraries/emails/empty.provider';
import { NodeMailerProvider } from '@gitroom/nestjs-libraries/emails/node.mailer.provider';
import { TemporalService } from 'nestjs-temporal-core';
import { timer } from '@gitroom/helpers/utils/timer';

@Injectable()
export class EmailService {
  emailService: EmailInterface;
  constructor(private _temporalService: TemporalService) {
    this.emailService = this.selectProvider(process.env.EMAIL_PROVIDER!);
    console.log('Email service provider:', this.emailService.name);
    for (const key of this.emailService.validateEnvKeys) {
      if (!process.env[key]) {
        console.error(`Missing environment variable: ${key}`);
      }
    }
  }

  hasProvider() {
    return !(this.emailService instanceof EmptyProvider);
  }

  selectProvider(provider: string) {
    switch (provider) {
      case 'resend':
        return new ResendProvider();
      case 'nodemailer':
        return new NodeMailerProvider();
      default:
        return new EmptyProvider();
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    addTo: 'top' | 'bottom',
    replyTo?: string
  ) {
    return this._temporalService.client
      .getRawClient()
      ?.workflow.signalWithStart('sendEmailWorkflow', {
        taskQueue: 'main',
        workflowId: 'send_email',
        signal: 'sendEmail',
        args: [{ queue: [] }],
        signalArgs: [{ to, subject, html, replyTo, addTo }],
        workflowIdConflictPolicy: 'USE_EXISTING',
      });
  }

  async sendEmailSync(
    to: string,
    subject: string,
    html: string,
    replyTo?: string
  ) {
    if (to.indexOf('@') === -1) {
      return;
    }

    if (!process.env.EMAIL_FROM_ADDRESS || !process.env.EMAIL_FROM_NAME) {
      console.log(
        'Email sender information not found in environment variables'
      );
      return;
    }

    // Brand-aligned email template — colors from socialstream-ops/docs/brand/colors.md.
    const modifiedHtml = `
    <div style="
        background: #F7F8FB;
        padding: 2rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    ">
        <div style="
            background-color: #FFFFFF;
            border: 1px solid #E5E8EE;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(26, 26, 46, 0.06);
            max-width: 48rem;
            width: 100%;
            margin: 0 auto;
            padding: 2rem;
        ">
            <div style="margin-bottom: 1.5rem;">
                <span style="
                    display: inline-block;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1A6FE8;
                    letter-spacing: -0.01em;
                ">SocialStream</span>
            </div>
            <h1 style="
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 1.5rem;
                text-align: left;
                color: #1A1A2E;
                letter-spacing: -0.01em;
            ">${subject}</h1>

            <div style="
                margin-bottom: 2rem;
                color: #1A1A2E;
                line-height: 1.55;
            ">
                ${html}
            </div>

            <div style="
                border-top: 1px solid #E5E8EE;
                padding-top: 1.5rem;
                color: #5A6075;
                font-size: 12px;
            ">
                <div style="font-size: 14px; font-weight: 600; color: #1A1A2E; margin-bottom: 4px;">${process.env.EMAIL_FROM_NAME}</div>
                <div>
                  You can change your notification preferences in your <a href="${process.env.FRONTEND_URL}/settings" style="color: #1A6FE8;">account settings</a>.
                </div>
            </div>
        </div>
    </div>
    `;

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const sends = await this.emailService.sendEmail(
          to,
          subject,
          modifiedHtml,
          process.env.EMAIL_FROM_NAME,
          process.env.EMAIL_FROM_ADDRESS,
          replyTo
        );
        console.log(sends);
        return;
      } catch (err) {
        lastErr = err;
        console.log(`Email attempt ${attempt + 1}/3 failed:`, err);
        if (attempt < 2) {
          await timer(700);
        }
      }
    }
    console.log(`Email to ${to} failed after 3 attempts:`, lastErr);
  }
}
