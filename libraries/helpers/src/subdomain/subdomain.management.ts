import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  // Hosted domains such as up.railway.app isolate cookies per tenant.
  const url = parse(domain, { allowPrivateDomains: true });
  // Older bundled suffix lists do not include Railway's tenant domains.
  if (url.hostname?.endsWith('.up.railway.app')) {
    return url.hostname;
  }
  return url.domain! ? '.' + url.domain! : url.hostname!;
}
