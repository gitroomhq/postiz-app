import { __awaiter } from "tslib";
const DUB_API_ENDPOINT = process.env.DUB_API_ENDPOINT || 'https://api.dub.co';
const DUB_SHORT_LINK_DOMAIN = process.env.DUB_SHORT_LINK_DOMAIN || 'dub.sh';
const getOptions = () => ({
    headers: {
        Authorization: `Bearer ${process.env.DUB_TOKEN}`,
        'Content-Type': 'application/json',
    },
});
export class Dub {
    constructor() {
        this.shortLinkDomain = DUB_SHORT_LINK_DOMAIN;
    }
    linksStatistics(links) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(links.map((link) => __awaiter(this, void 0, void 0, function* () {
                const response = yield (yield fetch(`${DUB_API_ENDPOINT}/links/info?domain=${this.shortLinkDomain}&key=${link.split('/').pop()}`, getOptions())).json();
                return {
                    short: link,
                    original: response.url,
                    clicks: response.clicks,
                };
            })));
        });
    }
    convertLinkToShortLink(id, link) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield (yield fetch(`${DUB_API_ENDPOINT}/links`, Object.assign(Object.assign({}, getOptions()), { method: 'POST', body: JSON.stringify({
                    url: link,
                    tenantId: id,
                    domain: this.shortLinkDomain,
                }) }))).json()).shortLink;
        });
    }
    convertShortLinkToLink(shortLink) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (yield (yield fetch(`${DUB_API_ENDPOINT}/links/info?domain=${shortLink}`, getOptions())).json()).url;
        });
    }
    // recursive functions that gets maximum 100 links per request if there are less than 100 links stop the recursion
    getAllLinksStatistics(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, page = 1) {
            const response = yield (yield fetch(`${DUB_API_ENDPOINT}/links?tenantId=${id}&page=${page}&pageSize=100`, getOptions())).json();
            const mapLinks = response.links.map((link) => ({
                short: link,
                original: response.url,
                clicks: response.clicks,
            }));
            if (mapLinks.length < 100) {
                return mapLinks;
            }
            return [...mapLinks, ...(yield this.getAllLinksStatistics(id, page + 1))];
        });
    }
}
//# sourceMappingURL=dub.js.map