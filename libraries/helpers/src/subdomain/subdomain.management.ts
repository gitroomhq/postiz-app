import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  // allowPrivateDomains makes tldts honor the private section of the Public
  // Suffix List (vercel.app, *.heiyu.space, ...). Without it, an instance
  // hosted on such a suffix gets a cookie Domain set to the suffix itself
  // (e.g. ".vercel.app"), which browsers reject -- login succeeds but the
  // session cookie is never stored.
  const url = parse(domain, { allowPrivateDomains: true });
  return url.domain! ? '.' + url.domain! : url.hostname!;
}
