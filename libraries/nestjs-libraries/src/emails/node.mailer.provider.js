import { __awaiter } from "tslib";
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: +process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
export class NodeMailerProvider {
    constructor() {
        this.name = 'nodemailer';
        this.validateEnvKeys = [
            'EMAIL_HOST',
            'EMAIL_PORT',
            'EMAIL_SECURE',
            'EMAIL_USER',
            'EMAIL_PASS',
        ];
    }
    sendEmail(to, subject, html, emailFromName, emailFromAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const sends = yield transporter.sendMail({
                from: `${emailFromName} <${emailFromAddress}>`, // sender address
                to: to, // list of receivers
                subject: subject, // Subject line
                text: html, // plain text body
                html: html, // html body
            });
            return sends;
        });
    }
}
//# sourceMappingURL=node.mailer.provider.js.map