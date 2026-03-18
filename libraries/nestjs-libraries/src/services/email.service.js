import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { ResendProvider } from "../emails/resend.provider";
import { EmptyProvider } from "../emails/empty.provider";
import { NodeMailerProvider } from "../emails/node.mailer.provider";
import { TemporalService } from 'nestjs-temporal-core';
import { timer } from "../../../helpers/src/utils/timer";
let EmailService = class EmailService {
    constructor(_temporalService) {
        this._temporalService = _temporalService;
        this.emailService = this.selectProvider(process.env.EMAIL_PROVIDER);
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
    selectProvider(provider) {
        switch (provider) {
            case 'resend':
                return new ResendProvider();
            case 'nodemailer':
                return new NodeMailerProvider();
            default:
                return new EmptyProvider();
        }
    }
    sendEmail(to, subject, html, addTo, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            return (_a = this._temporalService.client
                .getRawClient()) === null || _a === void 0 ? void 0 : _a.workflow.signalWithStart('sendEmailWorkflow', {
                taskQueue: 'main',
                workflowId: 'send_email',
                signal: 'sendEmail',
                args: [{ queue: [] }],
                signalArgs: [{ to, subject, html, replyTo, addTo }],
                workflowIdConflictPolicy: 'USE_EXISTING',
            });
        });
    }
    sendEmailSync(to, subject, html, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            if (to.indexOf('@') === -1) {
                return;
            }
            if (!process.env.EMAIL_FROM_ADDRESS || !process.env.EMAIL_FROM_NAME) {
                console.log('Email sender information not found in environment variables');
                return;
            }
            const modifiedHtml = `
    <div style="
        background: linear-gradient(to bottom right, #e6f2ff, #f0e6ff);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    ">
        <div style="
            background-color: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(4px);
            border-radius: 0.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            max-width: 48rem;
            width: 100%;
            padding: 2rem;
        ">
            <h1 style="
                font-size: 1.875rem;
                font-weight: bold;
                margin-bottom: 1.5rem;
                text-align: left;
                color: #1f2937;
            ">${subject}</h1>
            
            <div style="
                margin-bottom: 2rem;
                color: #374151;
            ">
                ${html}
            </div>
            
            <div style="
                display: flex;
                align-items: center;
                border-top: 1px solid #e5e7eb;
                padding-top: 1.5rem;
            ">
                <div>
                    <h2 style="
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin: 0;
                    ">${process.env.EMAIL_FROM_NAME}</h2>
                    <div style="font-size: 12px">
                      You can change your notification preferences in your <a href="${process.env.FRONTEND_URL}/settings">account settings.</a>
                     </div>
                </div>
            </div>
        </div>
    </div>
    `;
            let lastErr;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const sends = yield this.emailService.sendEmail(to, subject, modifiedHtml, process.env.EMAIL_FROM_NAME, process.env.EMAIL_FROM_ADDRESS, replyTo);
                    console.log(sends);
                    return;
                }
                catch (err) {
                    lastErr = err;
                    console.log(`Email attempt ${attempt + 1}/3 failed:`, err);
                    if (attempt < 2) {
                        yield timer(700);
                    }
                }
            }
            console.log(`Email to ${to} failed after 3 attempts:`, lastErr);
        });
    }
};
EmailService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [TemporalService])
], EmailService);
export { EmailService };
//# sourceMappingURL=email.service.js.map