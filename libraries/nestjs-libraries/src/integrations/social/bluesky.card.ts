import { AppBskyRichtextFacet, RichText, UnicodeString } from '@atproto/api';
import { blueskyShortUrl } from '@gitroom/helpers/utils/bluesky.short.url';
import { getSsrfSafeAxios } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

// Bluesky never unfurls a link by itself: the client builds the card
// (app.bsky.embed.external) from the page's metadata, and shows the link text
// shortened while the facet keeps the full URL. The official app does both;
// these do the same for posts published through Postiz.

const PAGE_MAX_BYTES = 1_000_000;
const PAGE_TIMEOUT_MS = 10_000;
const TITLE_MAX = 300;
const DESCRIPTION_MAX = 1000;

const linkUri = (facet: AppBskyRichtextFacet.Main): string | undefined =>
  (facet.features.find(
    (f) => f.$type === 'app.bsky.richtext.facet#link'
  ) as AppBskyRichtextFacet.Link | undefined)?.uri;

// The URI of the first link in the text, after detectFacets.
export const firstLinkUri = (rt: RichText): string | undefined => {
  const links = (rt.facets || [])
    .filter((f) => linkUri(f))
    .sort((a, b) => a.index.byteStart - b.index.byteStart);
  return links.length ? linkUri(links[0]) : undefined;
};

// Port of shortenLinks in bluesky-social/social-app: replace each link's text
// with its short form and keep the facet pointing at the full URL. Run it after
// detectFacets.
export const shortenLinks = (rt: RichText): RichText => {
  if (!rt.facets?.length) {
    return rt;
  }
  rt = rt.clone();
  // insert/delete renumber the facets, so walk them by position from the end
  const links = rt.facets!
    .filter((f) => linkUri(f))
    .sort((a, b) => b.index.byteStart - a.index.byteStart);
  for (const facet of links) {
    const { byteStart, byteEnd } = facet.index;
    const url = rt.unicodeText.slice(byteStart, byteEnd);
    const shortened = new UnicodeString(blueskyShortUrl(url));
    if (shortened.utf16 === url) {
      continue;
    }
    rt.insert(byteStart, shortened.utf16);
    facet.index.byteStart = byteStart;
    facet.index.byteEnd = byteStart + shortened.length;
    rt.delete(byteStart + shortened.length, byteEnd + shortened.length);
  }
  return rt;
};

export type LinkCardMeta = {
  title: string;
  description: string;
  image: string;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const point =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      try {
        return String.fromCodePoint(point);
      } catch (e) {
        return match;
      }
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });

const clean = (text: string | undefined, max: number): string =>
  decodeEntities(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const ATTR_REGEX = /([a-zA-Z_:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

// Open Graph and Twitter card metadata, with <title> and the plain description
// as fallbacks. A regex over <meta> tags is enough for this; nothing in the
// page is run.
export const parseLinkCardMeta = (
  html: string,
  pageUrl: string
): LinkCardMeta => {
  const head = html.slice(0, PAGE_MAX_BYTES);
  const meta: Record<string, string> = {};
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(ATTR_REGEX)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    }
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) {
      meta[key] = attrs.content;
    }
  }
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  let image = '';
  const rawImage =
    meta['og:image'] || meta['og:image:url'] || meta['twitter:image'] || '';
  if (rawImage) {
    try {
      const resolved = new URL(decodeEntities(rawImage.trim()), pageUrl);
      if (resolved.protocol === 'https:' || resolved.protocol === 'http:') {
        image = resolved.toString();
      }
    } catch (e) {
      image = '';
    }
  }

  return {
    title: clean(meta['og:title'] || meta['twitter:title'] || titleTag, TITLE_MAX),
    description: clean(
      meta['og:description'] ||
        meta['twitter:description'] ||
        meta['description'],
      DESCRIPTION_MAX
    ),
    image,
  };
};

// The page's card metadata, or undefined when it can't be read or has none.
export const fetchLinkCardMeta = async (
  url: string
): Promise<LinkCardMeta | undefined> => {
  const response = await getSsrfSafeAxios().get(url, {
    responseType: 'text',
    timeout: PAGE_TIMEOUT_MS,
    maxContentLength: PAGE_MAX_BYTES,
    maxRedirects: 4,
    headers: {
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      'User-Agent': 'Mozilla/5.0 (compatible; Postiz link preview)',
    },
  });
  const type = String(response.headers?.['content-type'] || '');
  if (!/html/i.test(type) || typeof response.data !== 'string') {
    return undefined;
  }
  const finalUrl = response.request?.res?.responseUrl || url;
  const meta = parseLinkCardMeta(response.data, finalUrl);
  return meta.title || meta.description ? meta : undefined;
};
