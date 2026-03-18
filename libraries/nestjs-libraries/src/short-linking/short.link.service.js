var ShortLinkService_1;
import { __awaiter, __decorate } from "tslib";
import { Dub } from "./providers/dub";
import { Empty } from "./providers/empty";
import { Injectable } from '@nestjs/common';
import { ShortIo } from './providers/short.io';
import { Kutt } from './providers/kutt';
import { LinkDrip } from './providers/linkdrip';
import { uniq } from 'lodash';
import striptags from 'striptags';
const getProvider = () => {
    if (process.env.DUB_TOKEN) {
        return new Dub();
    }
    if (process.env.SHORT_IO_SECRET_KEY) {
        return new ShortIo();
    }
    if (process.env.KUTT_API_KEY) {
        return new Kutt();
    }
    if (process.env.LINK_DRIP_API_KEY) {
        return new LinkDrip();
    }
    return new Empty();
};
let ShortLinkService = ShortLinkService_1 = class ShortLinkService {
    askShortLinkedin(messages) {
        if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
            return false;
        }
        const mergeMessages = messages.join(' ');
        const urlRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gm;
        const urls = mergeMessages.match(urlRegex);
        if (!urls) {
            // No URLs found, return the original text
            return false;
        }
        return urls.some((url) => url.indexOf(ShortLinkService_1.provider.shortLinkDomain) === -1);
    }
    convertTextToShortLinks(id, messagesList) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
                return messagesList;
            }
            const messages = messagesList.map((text) => {
                return text
                    .replace(/&amp;/g, '&')
                    .replace(/&quest;/g, '?')
                    .replace(/&num;/g, '#');
            });
            const urlRegex = /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gm;
            return Promise.all(messages.map((text) => __awaiter(this, void 0, void 0, function* () {
                const urls = uniq(text.match(urlRegex));
                if (!urls) {
                    // No URLs found, return the original text
                    return text;
                }
                const replacementMap = {};
                // Process each URL asynchronously
                yield Promise.all(urls.map((url) => __awaiter(this, void 0, void 0, function* () {
                    if (url.indexOf(ShortLinkService_1.provider.shortLinkDomain) === -1) {
                        replacementMap[url] =
                            yield ShortLinkService_1.provider.convertLinkToShortLink(id, url);
                    }
                    else {
                        replacementMap[url] = url; // Keep the original URL if it matches the prefix
                    }
                })));
                // Replace the URLs in the text with their replacements
                return text.replace(urlRegex, (url) => replacementMap[url]);
            })));
        });
    }
    convertShortLinksToLinks(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
                return messages;
            }
            const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
            return Promise.all(messages.map((text) => __awaiter(this, void 0, void 0, function* () {
                const urls = text.match(urlRegex);
                if (!urls) {
                    // No URLs found, return the original text
                    return text;
                }
                const replacementMap = {};
                // Process each URL asynchronously
                yield Promise.all(urls.map((url) => __awaiter(this, void 0, void 0, function* () {
                    if (url.indexOf(ShortLinkService_1.provider.shortLinkDomain) > -1) {
                        replacementMap[url] =
                            yield ShortLinkService_1.provider.convertShortLinkToLink(url);
                    }
                    else {
                        replacementMap[url] = url; // Keep the original URL if it matches the prefix
                    }
                })));
                // Replace the URLs in the text with their replacements
                return text.replace(urlRegex, (url) => replacementMap[url]);
            })));
        });
    }
    getStatistics(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
                return [];
            }
            const mergeMessages = messages.join(' ');
            const regex = new RegExp(`https?://${ShortLinkService_1.provider.shortLinkDomain.replace('.', '\\.')}/[^\\s]*`, 'g');
            const urls = striptags(mergeMessages).match(regex);
            if (!urls) {
                // No URLs found, return the original text
                return [];
            }
            return ShortLinkService_1.provider.linksStatistics(urls);
        });
    }
    getAllLinks(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (ShortLinkService_1.provider.shortLinkDomain === 'empty') {
                return [];
            }
            return ShortLinkService_1.provider.getAllLinksStatistics(id, 1);
        });
    }
};
ShortLinkService.provider = getProvider();
ShortLinkService = ShortLinkService_1 = __decorate([
    Injectable()
], ShortLinkService);
export { ShortLinkService };
//# sourceMappingURL=short.link.service.js.map