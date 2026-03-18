import { __awaiter } from "tslib";
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY || 're_132');
export class ResendProvider {
    constructor() {
        this.name = 'resend';
        this.validateEnvKeys = ['RESEND_API_KEY'];
    }
    sendEmail(to, subject, html, emailFromName, emailFromAddress, replyTo) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const sends = yield resend.emails.send(Object.assign({ from: `${emailFromName} <${emailFromAddress}>`, to,
                    subject,
                    html }, (replyTo && { reply_to: replyTo })));
                return sends;
            }
            catch (err) {
                console.log(err);
            }
            return { sent: false };
        });
    }
}
//# sourceMappingURL=resend.provider.js.map