import { __awaiter } from "tslib";
const LINK_DRIP_API_ENDPOINT = process.env.LINK_DRIP_API_ENDPOINT || 'https://api.linkdrip.com/v1/';
const LINK_DRIP_SHORT_LINK_DOMAIN = process.env.LINK_DRIP_SHORT_LINK_DOMAIN || 'dripl.ink';
const getOptions = () => ({
    headers: {
        Authorization: `Bearer ${process.env.LINK_DRIP_API_KEY}`,
        'Content-Type': 'application/json',
    },
});
export class LinkDrip {
    constructor() {
        this.shortLinkDomain = LINK_DRIP_SHORT_LINK_DOMAIN;
    }
    linksStatistics(links) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve([]);
        });
    }
    convertLinkToShortLink(id, link) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${LINK_DRIP_API_ENDPOINT}/create`, Object.assign(Object.assign({}, getOptions()), { method: 'POST', body: JSON.stringify({
                        target_url: link,
                        custom_domain: this.shortLinkDomain,
                    }) }));
                if (!response.ok) {
                    throw new Error(`Failed to create LinkDrip API short link with status: ${response.status}`);
                }
                const data = yield response.json();
                return data.link;
            }
            catch (error) {
                throw new Error(`Failed to create LinkDrip short link: ${error}`);
            }
        });
    }
    convertShortLinkToLink(shortLink) {
        return __awaiter(this, void 0, void 0, function* () {
            return '';
        });
    }
    getAllLinksStatistics(id, page) {
        return Promise.resolve([]);
    }
}
//# sourceMappingURL=linkdrip.js.map