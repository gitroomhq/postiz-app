import { __awaiter } from "tslib";
const KUTT_API_ENDPOINT = process.env.KUTT_API_ENDPOINT || 'https://kutt.it/api/v2';
const KUTT_SHORT_LINK_DOMAIN = process.env.KUTT_SHORT_LINK_DOMAIN || 'kutt.it';
const getOptions = () => ({
    headers: {
        'X-API-Key': process.env.KUTT_API_KEY,
        'Content-Type': 'application/json',
    },
});
export class Kutt {
    constructor() {
        this.shortLinkDomain = KUTT_SHORT_LINK_DOMAIN;
    }
    linksStatistics(links) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(links.map((link) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c;
                const linkId = link.split('/').pop();
                try {
                    const response = yield fetch(`${KUTT_API_ENDPOINT}/links/${linkId}/stats`, getOptions());
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = yield response.json();
                    return {
                        short: link,
                        original: data.address || '',
                        clicks: ((_c = (_b = (_a = data.lastDay) === null || _a === void 0 ? void 0 : _a.stats) === null || _b === void 0 ? void 0 : _b.reduce((total, stat) => total + stat, 0)) === null || _c === void 0 ? void 0 : _c.toString()) || '0',
                    };
                }
                catch (error) {
                    return {
                        short: link,
                        original: '',
                        clicks: '0',
                    };
                }
            })));
        });
    }
    convertLinkToShortLink(id, link) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield fetch(`${KUTT_API_ENDPOINT}/links`, Object.assign(Object.assign({}, getOptions()), { method: 'POST', body: JSON.stringify({
                        target: link,
                        domain: this.shortLinkDomain,
                        reuse: false,
                    }) }));
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = yield response.json();
                return data.link;
            }
            catch (error) {
                throw new Error(`Failed to create short link: ${error}`);
            }
        });
    }
    convertShortLinkToLink(shortLink) {
        return __awaiter(this, void 0, void 0, function* () {
            const linkId = shortLink.split('/').pop();
            try {
                const response = yield fetch(`${KUTT_API_ENDPOINT}/links/${linkId}/stats`, getOptions());
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = yield response.json();
                return data.address || '';
            }
            catch (error) {
                throw new Error(`Failed to get original link: ${error}`);
            }
        });
    }
    getAllLinksStatistics(id_1) {
        return __awaiter(this, arguments, void 0, function* (id, page = 1) {
            var _a;
            try {
                const response = yield fetch(`${KUTT_API_ENDPOINT}/links?limit=100&skip=${(page - 1) * 100}`, getOptions());
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = yield response.json();
                const mapLinks = ((_a = data.data) === null || _a === void 0 ? void 0 : _a.map((link) => {
                    var _a;
                    return ({
                        short: link.link,
                        original: link.address,
                        clicks: ((_a = link.visit_count) === null || _a === void 0 ? void 0 : _a.toString()) || '0',
                    });
                })) || [];
                if (mapLinks.length < 100) {
                    return mapLinks;
                }
                return [...mapLinks, ...(yield this.getAllLinksStatistics(id, page + 1))];
            }
            catch (error) {
                return [];
            }
        });
    }
}
//# sourceMappingURL=kutt.js.map