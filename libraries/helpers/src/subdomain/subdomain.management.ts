import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  const url = parse(domain);
  // Return undefined for domains on the Public Suffix List (e.g. *.ts.net,
  // *.ngrok.io) — browsers reject Set-Cookie: Domain=.<PSL-entry>, so we
  // set a host-only cookie instead (no Domain attribute).
  if (!url.domain) {
    return undefined;
  }
  return '.' + url.domain;
}
