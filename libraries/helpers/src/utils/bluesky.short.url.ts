// Bluesky counts the text it displays against its 300-grapheme limit, and the
// official app displays a link shortened to its host and the start of its path
// while the link facet keeps the full URL. These mirror toShortUrl in
// bluesky-social/social-app and the link detection in @atproto/api, so a post
// is counted the way the provider publishes it.

export const blueskyShortUrl = (url: string): string => {
  try {
    const urlp = new URL(url);
    if (urlp.protocol !== 'http:' && urlp.protocol !== 'https:') {
      return url;
    }
    const path =
      (urlp.pathname === '/' ? '' : urlp.pathname) + urlp.search + urlp.hash;
    if (path.length > 15) {
      return urlp.host + path.slice(0, 13) + '...';
    }
    return urlp.host + path;
  } catch (e) {
    return url;
  }
};

const LINK_REGEX = /(^|\s|\()(https?:\/\/\S+)/gim;

// The link as @atproto/api's detectFacets cuts it: trailing punctuation and an
// unbalanced closing parenthesis are not part of it.
const trimLink = (link: string): string => {
  let url = link;
  if (/[.,;:!?]$/.test(url)) {
    url = url.slice(0, -1);
  }
  if (/[)]$/.test(url) && !url.includes('(')) {
    url = url.slice(0, -1);
  }
  return url;
};

export const blueskyDisplayText = (text: string): string =>
  text.replace(LINK_REGEX, (_match, lead: string, link: string) => {
    const url = trimLink(link);
    return lead + blueskyShortUrl(url) + link.slice(url.length);
  });

export const graphemeLength = (text: string): number => {
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter(undefined, {
      granularity: 'grapheme',
    });
    let count = 0;
    for (const _ of segmenter.segment(text)) {
      count++;
    }
    return count;
  }
  return Array.from(text).length;
};

export const blueskyLength = (text: string): number =>
  graphemeLength(blueskyDisplayText(text));
