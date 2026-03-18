import { __awaiter } from "tslib";
const options = {
    headers: {
        Authorization: `Bearer ${process.env.SHORT_IO_SECRET_KEY}`,
        'Content-Type': 'application/json',
    },
};
export class ShortIo {
    constructor() {
        this.shortLinkDomain = 'short.io';
    }
    linksStatistics(links) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(links.map((link) => __awaiter(this, void 0, void 0, function* () {
                const url = `https://api.short.io/links/expand?domain=${this.shortLinkDomain}&path=${link.split('/').pop()}`;
                const response = yield fetch(url, options).then((res) => res.json());
                const linkStatisticsUrl = `https://statistics.short.io/statistics/link/${response.id}?period=last30&tz=UTC`;
                const statResponse = yield fetch(linkStatisticsUrl, options).then((res) => res.json());
                return {
                    short: response.shortURL,
                    original: response.originalURL,
                    clicks: statResponse.totalClicks,
                };
            })));
        });
    }
    convertLinkToShortLink(id, link) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`https://api.short.io/links`, Object.assign(Object.assign({}, options), { method: 'POST', body: JSON.stringify({
                    url: link,
                    tenantId: id,
                    domain: this.shortLinkDomain,
                    originalURL: link,
                }) })).then((res) => res.json());
            return response.shortURL;
        });
    }
    convertShortLinkToLink(shortLink) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (yield (yield fetch(`https://api.short.io/links/expand?domain=${this.shortLinkDomain}&path=${shortLink.split('/').pop()}`, options)).json()).originalURL;
        });
    }
    // recursive functions that gets maximum 100 links per request if there are less than 100 links stop the recursion
    getAllLinksStatistics(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, page = 1) {
            const response = yield (yield fetch(`https://api.short.io/api/links?domain_id=${id}&limit=150`, options)).json();
            const mapLinks = response.links.map((link) => __awaiter(this, void 0, void 0, function* () {
                const linkStatisticsUrl = `https://statistics.short.io/statistics/link/${response.id}?period=last30&tz=UTC`;
                const statResponse = yield fetch(linkStatisticsUrl, options).then((res) => res.json());
                return {
                    short: link,
                    original: response.url,
                    clicks: statResponse.totalClicks,
                };
            }));
            if (mapLinks.length < 100) {
                return mapLinks;
            }
            return [...mapLinks, ...(yield this.getAllLinksStatistics(id, page + 1))];
        });
    }
}
//# sourceMappingURL=short.io.js.map