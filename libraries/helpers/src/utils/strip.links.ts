// Keep this in sync with the URL detection used by the short linking service
const urlRegex = () =>
  /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*))/gm;

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
