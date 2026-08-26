// Scheme'd URLs - keep this in sync with the URL detection used by the short
// linking service
const schemeUrl =
  /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

// Scheme-less domains (postiz.com, bit.ly/abc): X linkifies these into t.co
// links exactly like full URLs, so they count as link posts too. The TLD list
// is the common subset of what X linkifies - intentionally NOT synced with the
// short linking service, which must only rewrite real scheme'd URLs.
// The lookbehind keeps email addresses (user@domain.com) and dotted paths
// intact - X does not linkify those either.
const bareDomainTlds =
  'online|store|cloud|social|world|blog|shop|site|tech|news|live|link|info|app|dev|xyz|com|net|org|edu|gov|biz|io|co|ai|me|tv|cc|ly|gl|sh|fm|am|be|to|gg|so|is|us|uk|ca|au|de|fr|es|it|nl|se|no|dk|fi|pl|ch|at|ie|nz|za|in|jp|br|mx|ru|eu';

const bareDomain = new RegExp(
  `(?<![\\w@./-])(?:[a-zA-Z0-9-]+\\.)+(?:${bareDomainTlds})\\b(?:\\/[-a-zA-Z0-9()@:%_+.~#?&/=]*)?`
);

const urlRegex = () =>
  new RegExp(`(?:${schemeUrl.source})|(?:${bareDomain.source})`, 'gmi');

export function hasLinks(text?: string | null): boolean {
  return !!(text || '').match(urlRegex());
}

export function stripLinks(text?: string | null): string {
  return (text || '')
    .replace(urlRegex(), '')
    // collapse the whitespace / empty anchor leftovers the removed link left behind
    .replace(/<a\b[^>]*>\s*<\/a>/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .trim();
}
