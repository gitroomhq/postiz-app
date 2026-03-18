import { __awaiter } from "tslib";
export class EmptyProvider {
    constructor() {
        this.name = 'no provider';
        this.validateEnvKeys = [];
    }
    sendEmail(to, subject, html) {
        return __awaiter(this, void 0, void 0, function* () {
            return `No email provider found, email was supposed to be sent to ${to} with subject: ${subject} and ${html}, html`;
        });
    }
}
//# sourceMappingURL=empty.provider.js.map