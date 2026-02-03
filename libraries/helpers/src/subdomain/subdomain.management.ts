import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string): string | undefined {
  const url = parse(domain);

  // If the domain is a public suffix (like synology.me, duckdns.org, ngrok.io, etc.),
  // don't set an explicit cookie domain - let the browser use host-only cookies.
  // This follows the same approach as Portainer and Sonarr/Radarr.
  // Setting domain to .synology.me would be rejected by browsers as a "supercookie"
  // because public suffixes are on the PSL (Public Suffix List).
  //
  // For postiz.alexbeav.synology.me:
  //   - hostname = "postiz.alexbeav.synology.me"
  //   - domain = "synology.me" (the registrable domain)
  //   - publicSuffix = "me"
  //   - isIcann = true (synology.me is on the ICANN section of PSL)
  //
  // Setting cookie domain to .synology.me would fail because browsers won't allow
  // cookies that could affect all *.synology.me sites.
  //
  // By returning undefined, Express won't set a Domain attribute, and the browser
  // will create a host-only cookie bound to the exact hostname.
  if (url.isIcann && url.publicSuffix !== url.domain) {
    // The domain's parent is on the public suffix list
    // Return undefined to use host-only cookies (like Portainer does)
    return undefined;
  }

  // For regular domains like postiz.example.com, return .example.com
  // This allows cookie sharing across subdomains when using a private domain
  return url.domain ? '.' + url.domain : undefined;
}
