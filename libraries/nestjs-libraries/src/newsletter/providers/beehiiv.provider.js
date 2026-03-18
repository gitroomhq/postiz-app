import { __awaiter } from "tslib";
export class BeehiivProvider {
    constructor() {
        this.name = 'beehiiv';
    }
    register(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = {
                email,
                reactivate_existing: false,
                send_welcome_email: true,
                utm_source: 'gitroom_platform',
            };
            yield fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIVE_PUBLICATION_ID}/subscriptions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${process.env.BEEHIIVE_API_KEY}`,
                },
                body: JSON.stringify(body),
            });
        });
    }
}
//# sourceMappingURL=beehiiv.provider.js.map