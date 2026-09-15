/**
 * In-app notifications store a single HTML/text blob (and, for newer rows, a
 * `link` column). Publish success used to dump the live URL inline, which
 * overflowed the 380px panel. Refresh failures used to append
 * `$FRONTEND_URL/launches` so the row looked like a post and the CTA said
 * "Open link". Split the URL out, classify the row, and pick a CTA that
 * matches the destination.
 */

const URL_RE = /https?:\/\/[^\s<>"']+/gi;

const APP_PATHS = [
  '/channels',
  '/launches',
  '/billing',
  '/settings',
  '/analytics',
  '/media',
  '/plugs',
  '/agents',
  '/connections',
  '/integrations',
];

/** Identifiers as they appear in stored copy vs the product name. */
const PROVIDER_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  x: 'X',
  twitter: 'X',
  tiktok: 'TikTok',
  'tiktok-business': 'TikTok Business',
  facebook: 'Facebook',
  instagram: 'Instagram',
  'instagram-standalone': 'Instagram',
  linkedin: 'LinkedIn',
  'linkedin-page': 'LinkedIn Page',
  threads: 'Threads',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
  discord: 'Discord',
  slack: 'Slack',
  telegram: 'Telegram',
  twitch: 'Twitch',
  wrapcast: 'Farcaster',
  gmb: 'Google Business',
  devto: 'Dev.to',
  hashnode: 'Hashnode',
  medium: 'Medium',
  wordpress: 'WordPress',
  dribbble: 'Dribbble',
  lemmy: 'Lemmy',
  nostr: 'Nostr',
  vk: 'VK',
  listmonk: 'ListMonk',
  moltbook: 'Moltbook',
  whop: 'Whop',
  skool: 'Skool',
  mewe: 'MeWe',
  tumblr: 'Tumblr',
  kick: 'Kick',
};

export type NotificationKind = 'success' | 'fail' | 'warning' | 'info';

export type NotificationAction =
  | 'view_post'
  | 'reconnect'
  | 'open_channel'
  | 'open_billing'
  | 'open_calendar'
  | 'open_link'
  | null;

export type SplitNotification = {
  text: string;
  url: string | null;
  kind: NotificationKind;
  action: NotificationAction;
  external: boolean;
};

function trimUrl(raw: string): string {
  return raw.replace(/[),.;!?]+$/g, '');
}

function prettyProvider(id: string): string {
  return PROVIDER_LABELS[id.toLowerCase()] || id;
}

function parseHref(raw: string): URL | null {
  try {
    if (raw.startsWith('/')) {
      return new URL(raw, 'https://app.postqueen.ai');
    }
    return new URL(raw);
  } catch {
    return null;
  }
}

function isAppPath(pathname: string): boolean {
  return APP_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function providerFromText(text: string): string | null {
  const patterns = [
    /could not refresh your ([a-z0-9-]+) channel/i,
    /couldn['’]t post to ([a-z0-9-]+)/i,
    /error posting(?: comments)? on ([a-z0-9-]+)/i,
    /has been published on ([a-z0-9-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].toLowerCase();
    }
  }
  return null;
}

function providerFromHref(href: string | null): string | null {
  if (!href) {
    return null;
  }
  const parsed = parseHref(href);
  if (!parsed || parsed.pathname !== '/channels') {
    return null;
  }
  return (
    parsed.searchParams.get('channel') ||
    parsed.searchParams.get('added') ||
    null
  );
}

function channelPath(provider?: string | null, focus?: string | null): string {
  const params = new URLSearchParams();
  if (provider) {
    params.set('channel', provider);
  }
  if (focus) {
    params.set('focus', focus);
  }
  const qs = params.toString();
  return qs ? `/channels?${qs}` : '/channels';
}

function appPathFromHref(href: string): string | null {
  const parsed = parseHref(href);
  if (!parsed || !isAppPath(parsed.pathname)) {
    return null;
  }
  return `${parsed.pathname}${parsed.search}`;
}

function kindFrom(content: string): NotificationKind {
  if (
    /could not refresh|need to reconnect|connect it again|reconnect it/i.test(
      content
    )
  ) {
    return 'warning';
  }
  if (
    /switched off|no channel to post|connecting it was never finished|it's disabled|subscription is no longer active|payment disputed|payment refunded|payment failed|could not charge/i.test(
      content
    )
  ) {
    return 'warning';
  }
  if (
    /couldn['’]t publish|couldn['’]t post|couldn['’]t confirm|error posting|was not published|an error occurred|could not schedule|could not publish/i.test(
      content
    )
  ) {
    return 'fail';
  }
  if (/has been published|switched back on|back on and can publish/i.test(content)) {
    return 'success';
  }
  return 'info';
}

function actionFrom(content: string): NotificationAction {
  if (
    /could not refresh|need to reconnect|connect it again|reconnect it/i.test(
      content
    )
  ) {
    return 'reconnect';
  }
  if (
    /connecting it was never finished|open the channel|it's disabled|no channel to post/i.test(
      content
    )
  ) {
    return 'open_channel';
  }
  if (
    /from billing|go to billing|update your payment|subscribe again|plan has been suspended|plan it paid for has ended|upgrade, or remove/i.test(
      content
    )
  ) {
    return 'open_billing';
  }
  if (
    /open the post on your calendar|reschedule the post from your calendar|saved drafts instead|could not schedule|could not publish automatically/i.test(
      content
    )
  ) {
    return 'open_calendar';
  }
  if (/has been published/i.test(content)) {
    return 'view_post';
  }
  return null;
}

function cleanText(content: string): string {
  let text = content
    .replace(/<[^>]+>/g, ' ')
    .replace(URL_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+at\s*$/i, '')
    .replace(/\s+([.,!?])/g, '$1')
    .trim();

  text = text.replace(
    /please go back to the system and connect it again\.?/i,
    'Reconnect it to keep publishing.'
  );

  text = text.replace(
    /your ([a-z0-9-]+) channel/i,
    (_, id: string) => `your ${prettyProvider(id)} channel`
  );

  return text;
}

export function splitNotificationContent(
  content: string,
  storedLink?: string | null
): SplitNotification {
  const found = content.match(URL_RE);
  const extracted = found?.[0] ? trimUrl(found[0]) : null;
  const text = cleanText(content) || content.trim();
  const kind = kindFrom(`${content} ${text}`);
  let action = actionFrom(`${content} ${text}`);

  const storedPath = storedLink ? appPathFromHref(storedLink) || storedLink : null;
  const extractedPath = extracted ? appPathFromHref(extracted) : null;
  const provider =
    providerFromHref(storedPath) ||
    providerFromHref(extractedPath) ||
    providerFromText(`${content} ${text}`);

  let url: string | null = null;
  let external = false;

  if (action === 'reconnect' || action === 'open_channel') {
    const fromStored =
      storedPath && storedPath.startsWith('/channels') ? storedPath : null;
    const fromExtracted =
      extractedPath && extractedPath.startsWith('/channels')
        ? extractedPath
        : null;
    url = fromStored || fromExtracted || channelPath(provider);
  } else if (action === 'open_billing') {
    url =
      (storedPath && storedPath.startsWith('/billing') && storedPath) ||
      (extractedPath && extractedPath.startsWith('/billing') && extractedPath) ||
      '/billing';
  } else if (action === 'open_calendar') {
    url =
      (storedPath && storedPath.startsWith('/launches') && storedPath) ||
      '/launches';
  } else if (action === 'view_post') {
    const candidate = storedLink || extracted;
    if (candidate && !appPathFromHref(candidate)) {
      url = candidate;
      external = true;
    } else {
      action = null;
      url = null;
    }
  } else if (storedPath) {
    url = storedPath;
    if (storedPath.startsWith('/channels')) {
      action = action || 'open_channel';
    } else if (storedPath.startsWith('/billing')) {
      action = action || 'open_billing';
    } else if (storedPath.startsWith('/launches')) {
      action = action || 'open_calendar';
    }
  } else if (extracted && !extractedPath) {
    url = extracted;
    action = 'open_link';
    external = true;
  } else if (extractedPath) {
    // An app URL on a row we could not classify — do not show a generic
    // "Open link" that pretends it is a published post.
    url = extractedPath;
    if (extractedPath.startsWith('/channels')) {
      action = 'open_channel';
    } else if (extractedPath.startsWith('/billing')) {
      action = 'open_billing';
    } else if (extractedPath.startsWith('/launches')) {
      action = 'open_calendar';
    }
  }

  return {
    text: text || content.trim(),
    url,
    kind,
    action,
    external,
  };
}
