import { parse } from 'tldts';
export function getCookieUrlFromDomain(domain) {
    const url = parse(domain);
    return url.domain ? '.' + url.domain : url.hostname;
}
//# sourceMappingURL=subdomain.management.js.map