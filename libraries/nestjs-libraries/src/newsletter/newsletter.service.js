import { __awaiter } from "tslib";
import { newsletterProviders } from "./providers";
export class NewsletterService {
    static getProvider() {
        if (process.env.BEEHIIVE_API_KEY) {
            return newsletterProviders.find((p) => p.name === 'beehiiv');
        }
        if (process.env.LISTMONK_API_KEY) {
            return newsletterProviders.find((p) => p.name === 'listmonk');
        }
        return newsletterProviders.find((p) => p.name === 'empty');
    }
    static register(email) {
        return __awaiter(this, void 0, void 0, function* () {
            if (email.indexOf('@') === -1) {
                return;
            }
            return NewsletterService.getProvider().register(email);
        });
    }
}
//# sourceMappingURL=newsletter.service.js.map