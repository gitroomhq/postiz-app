import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, Relay, finalizeEvent, SimplePool, nip19 } from 'nostr-tools';

import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { Integration } from '@prisma/client';
import { Logger } from '@nestjs/common';

// @ts-ignore
global.WebSocket = WebSocket;

const list = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://temp.iris.to',
  'wss://vault.iris.to',
];

const pool = new SimplePool();

const searchRelays = [
  'wss://search.nos.today',
  'wss://relay.nostr.band',
  'wss://nos.lol',
];

// NIP-50 fan-out over 3 search relays needs a longer bound than a single
// NIP-05 https fetch — the two timeouts differ on purpose, not by accident.
const MENTION_TIMEOUT_MS = 8000;
const NIP05_FETCH_TIMEOUT_MS = 5000;
// Cap so a pasted wall of codes cannot bloat the event / get relay-rejected.
const MAX_MENTION_TAGS = 20;
// Backend keystroke guard (F1): exact npub/hex/nip05 codes are long, so the
// <3 gate only throttles free-text fan-out. UI must still debounce 250-300ms.
const MENTION_MIN_LENGTH = 3;
const MENTION_CACHE_TTL_MS = 5 * 60 * 1000;
const MENTION_CACHE_MAX = 100;
const MENTION_LABEL_MAX = 80;
const MENTION_IMAGE_MAX = 500;

type Kind0Content = {
  display_name?: unknown;
  displayName?: unknown;
  name?: unknown;
  picture?: unknown;
};

type MentionItem = { id: string; label: string; image: string };

export class NostrProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5;
  identifier = 'nostr';
  name = 'Nostr';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  toolTip = 'Make sure you private a HEX key of your Nostr private key, you can get it from websites like iris.to'

  private readonly logger = new Logger(NostrProvider.name);
  private mentionCache = new Map<
    string,
    { expires: number; value: MentionItem[] }
  >();
  private mentionInFlight = new Map<string, Promise<MentionItem[]>>();

  maxLength() {
    return 100000;
  }

  async customFields() {
    return [
      {
        key: 'password',
        label: 'Nostr private key',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeSecureId(17);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  private secretKey(password: string) {
    return Uint8Array.from(
      (password.match(/.{1,2}/g) || []).map((byte: any) => parseInt(byte, 16))
    );
  }

  private async findRelayInformation(pubkey: string) {
    // This queries ALL relays in parallel and resolves with
    // the first matching event from ANY relay.
    const evt = await pool.get(list, {
      kinds: [0],
      authors: [pubkey],
      limit: 1,
    });

    if (!evt) return {};

    let content: any = {};
    try {
      content = JSON.parse(evt.content || '{}');
    } catch {
      return {};
    }

    if (content.name || content.displayName || content.display_name) {
      return content;
    }

    return {};
  }

  private async publish(pubkey: string, event: any) {
    let id = '';
    for (const relay of list) {
      try {
        const relayInstance = await Relay.connect(relay);
        const value = new Promise<any>((resolve) => {
          relayInstance.subscribe([{ kinds: [1], authors: [pubkey] }], {
            eoseTimeout: 6000,
            onevent: (event) => {
              resolve(event);
            },
            oneose: () => {
              resolve({});
            },
            onclose: () => {
              resolve({});
            },
          });
        });

        await relayInstance.publish(event);
        const all = await value;
        relayInstance.close();
        // relayInstance.close();
        id = id || all?.id;
      } catch (err) {
        /**empty**/
      }
    }

    return id;
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    try {
      const body = JSON.parse(Buffer.from(params.code, 'base64').toString());

      const pubkey = getPublicKey(this.secretKey(body.password));

      const user = await this.findRelayInformation(pubkey);

      return {
        id: pubkey,
        name: user.display_name || user.displayName || user.name || 'No Name',
        accessToken: AuthService.signJWT({ password: body.password }),
        refreshToken: '',
        expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
        picture: user?.picture || '',
        username: user.name || 'nousername',
      };
    } catch (e) {
      console.log(e);
      return 'Invalid credentials';
    }
  }

  private sanitizeLabel(value: unknown): string {
    return String(value ?? '').replace(/[<>&"']/g, '').slice(0, MENTION_LABEL_MAX);
  }

  private sanitizeImage(value: unknown): string {
    const s = String(value ?? '');
    return /^https:\/\/[^/\s]+\/\S*$/i.test(s)
      ? s.slice(0, MENTION_IMAGE_MAX)
      : '';
  }

  private getMentionCache(key: string): MentionItem[] | null {
    const entry = this.mentionCache.get(key.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.mentionCache.delete(key.toLowerCase());
      return null;
    }
    return entry.value;
  }

  private setMentionCache(key: string, value: MentionItem[]): void {
    if (this.mentionCache.size >= MENTION_CACHE_MAX) {
      const oldest = this.mentionCache.keys().next().value as
        | string
        | undefined;
      if (oldest !== undefined) this.mentionCache.delete(oldest);
    }
    this.mentionCache.set(key.toLowerCase(), {
      expires: Date.now() + MENTION_CACHE_TTL_MS,
      value,
    });
  }

  private formatProfileMention(
    pubkeyHex: string,
    content: Kind0Content
  ): MentionItem {
    const fallback = pubkeyHex.slice(0, 8);
    const rawDisplay =
      content?.display_name ?? content?.displayName ?? content?.name ?? fallback;
    const rawHandle = content?.name ?? fallback;
    const display = this.sanitizeLabel(rawDisplay) || fallback;
    const handle = this.sanitizeLabel(rawHandle) || fallback;
    let npub = pubkeyHex;
    try {
      npub = nip19.npubEncode(pubkeyHex);
    } catch {
      // keep hex fallback
    }
    return {
      id: npub,
      label:
        display && handle && display !== handle
          ? `${display} (${handle})`
          : display,
      image: this.sanitizeImage(content?.picture),
    };
  }

  private isBlockedIpLiteralHost(host: string): boolean {
    const h = host.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost')) return true;
    // IPv6 literals are never valid NIP-05 https hosts — block conservatively.
    if (h.includes(':') || h.includes('[') || h.includes(']')) return true;
    const parts = h.split('.');
    const isNumericPart = (p: string): boolean =>
      /^(0x[0-9a-f]+|0[0-7]*|[0-9]+)$/i.test(p);
    // All-numeric host = IP literal in disguise (dotted decimal/hex/octal or
    // a single decimal like 2130706433 / 0x7f.0.0.1). NIP-05 must be a DNS
    // name, so block the whole class instead of prefix-matching strings.
    if (parts.length > 0 && parts.every(isNumericPart)) return true;
    // Defense-in-depth for plain dotted-decimal private nets.
    if (
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h) ||
      h === '0.0.0.0'
    )
      return true;
    return false;
  }

  private async resolveNip05(nip05: string): Promise<string | null> {
    const [user, domainRaw] = nip05.split('@');
    const domain = (domainRaw || '').toLowerCase().replace(/\.$/, '');
    if (!user || !domain) return null;
    if (domain.length > 253 || user.length > 64) return null;
    // Hardening: validate user-supplied domain before SSRF-safe fetch.
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return null;
    if (
      domain.startsWith('.') ||
      domain.startsWith('-') ||
      domain.endsWith('.') ||
      domain.endsWith('-') ||
      domain.includes('..')
    )
      return null;
    const labels = domain.split('.');
    for (const label of labels) {
      if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null;
    }
    if (this.isBlockedIpLiteralHost(domain)) return null;
    // DNS-rebinding (e.g. 127.0.0.1.nip.io resolving to loopback after the
    // string check) cannot be caught by string checks; resolved-IP
    // enforcement is delegated to the SSRF-safe dispatcher inside this.fetch
    // (getSsrfSafeDispatcher in social.abstract.ts).
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NIP05_FETCH_TIMEOUT_MS);
    try {
      const res = await this.fetch(
        `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(user)}`,
        { signal: ctrl.signal } as RequestInit
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { names?: Record<string, unknown> };
      const pubkey = data?.names?.[user];
      if (typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey))
        return null;
      return pubkey.toLowerCase();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private decodeNpubToHex(input: string): string | null {
    try {
      const decoded = nip19.decode(input);
      if (decoded.type === 'npub' && typeof decoded.data === 'string') {
        return decoded.data;
      }
      // NIP-27 lists nprofile first; accept manually pasted nprofile codes.
      if (
        decoded.type === 'nprofile' &&
        typeof (decoded.data as { pubkey?: unknown })?.pubkey === 'string'
      ) {
        return (decoded.data as { pubkey: string }).pubkey;
      }
      return null;
    } catch {
      return null;
    }
  }

  override async mention(
    _token: string,
    d: { query: string },
    _id?: string,
    _integration?: Integration
  ): Promise<MentionItem[]> {
    const raw = (d?.query || '').trim().replace(/^@/, '');
    const query = raw.replace(/^nostr:/i, '');
    if (!query || query.length < MENTION_MIN_LENGTH) return [];

    // F1 backend guard: coalesce identical in-flight keystroke queries and
    // serve kind:0 from a 5-min LRU. NOTE: UI must still debounce 250-300ms
    // before calling mention() — backend coalescing only caps the fan-out.
    const cacheKey = query.toLowerCase();
    const cached = this.getMentionCache(cacheKey);
    if (cached) return cached;
    const inFlight = this.mentionInFlight.get(cacheKey);
    if (inFlight) return inFlight;

    const task = this.mentionUncached(query);
    this.mentionInFlight.set(cacheKey, task);
    try {
      const result = await task;
      this.setMentionCache(cacheKey, result);
      return result;
    } finally {
      this.mentionInFlight.delete(cacheKey);
    }
  }

  private async mentionUncached(query: string): Promise<MentionItem[]> {
    try {
      // Exact npub1.../nprofile1... -> kind:0 lookup on publish relays
      if (/^(npub1|nprofile1)[0-9a-z]+$/i.test(query)) {
        const hex = this.decodeNpubToHex(query.toLowerCase());
        if (hex) {
          const evt = await pool.get(list, {
            kinds: [0],
            authors: [hex],
            limit: 1,
          });
          let content: Kind0Content = {};
          try {
            content = JSON.parse(
              (evt as unknown as { content?: string })?.content || '{}'
            ) as Kind0Content;
          } catch {
            content = {};
          }
          return [this.formatProfileMention(hex, content)];
        }
        return [];
      }

      // Exact 64-char hex pubkey
      if (/^[0-9a-f]{64}$/i.test(query)) {
        const hex = query.toLowerCase();
        const evt = await pool.get(list, {
          kinds: [0],
          authors: [hex],
          limit: 1,
        });
        let content: Kind0Content = {};
        try {
          content = JSON.parse(
            (evt as unknown as { content?: string })?.content || '{}'
          ) as Kind0Content;
        } catch {
          content = {};
        }
        return [this.formatProfileMention(hex, content)];
      }

      // NIP-05 user@domain -> verify then kind:0 lookup
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(query)) {
        const hex = await this.resolveNip05(query);
        if (!hex) return [];
        const evt = await pool.get(list, {
          kinds: [0],
          authors: [hex],
          limit: 1,
        });
        let content: Kind0Content = {};
        try {
          content = JSON.parse(
            (evt as unknown as { content?: string })?.content || '{}'
          ) as Kind0Content;
        } catch {
          content = {};
        }
        return [this.formatProfileMention(hex, content)];
      }

      // Free-text NIP-50 search (best-effort, bounded + cancellable timeout)
      const searchPromise = pool.list(searchRelays, [
        { kinds: [0], search: query, limit: 10 },
      ]) as unknown as Promise<
        Array<{ pubkey?: string; content?: string }>
      >;
      let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<MentionItem[]>((resolve) => {
        timeoutTimer = setTimeout(() => {
          try {
            (
              searchPromise as unknown as { close?: () => void }
            )?.close?.();
            (
              searchPromise as unknown as { unsub?: () => void }
            )?.unsub?.();
            (
              searchPromise as unknown as { unsubscribe?: () => void }
            )?.unsubscribe?.();
          } catch {
            // ignore close errors
          }
          resolve([]);
        }, MENTION_TIMEOUT_MS);
      });
      let results: Array<{ pubkey?: string; content?: string }> = [];
      try {
        results = (await Promise.race([
          searchPromise,
          timeoutPromise,
        ])) as Array<{ pubkey?: string; content?: string }>;
      } finally {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      }

      return (results || []).slice(0, 10).flatMap((evt) => {
        const pubkey = typeof evt?.pubkey === 'string' ? evt.pubkey : '';
        if (!/^[0-9a-f]{64}$/i.test(pubkey)) return [];
        let content: Kind0Content = {};
        try {
          content = JSON.parse(evt?.content || '{}') as Kind0Content;
        } catch {
          content = {};
        }
        return [this.formatProfileMention(pubkey.toLowerCase(), content)];
      });
    } catch (err) {
      this.logger.warn(
        `nostr mention search failed for query=${JSON.stringify(query)}: ${(err as Error)?.message || err}`
      );
      return [];
    }
  }

  mentionFormat(idOrHandle: string, _name?: string): string {
    // Wiring (F6): composer MUST call this on insert. X-style `@{label}`
    // without a code cannot yield a p-tag — only npub/nprofile codes (with an
    // optional @ caught by extractMentionedPubkeys) are tagged; plain
    // @handle stays plain-text by design (NIP-27 tags are optional).
    const clean = (idOrHandle || '').replace(/^@/, '').replace(/^nostr:/i, '');
    if (/^(npub1|nprofile1)[0-9a-z]+$/i.test(clean))
      return `nostr:${clean.toLowerCase()}`;
    if (/^[0-9a-f]{64}$/i.test(clean)) {
      try {
        return `nostr:${nip19.npubEncode(clean.toLowerCase())}`;
      } catch {
        return `@${clean}`;
      }
    }
    // Fallback for NIP-05 handles (user@domain) and plain names:
    // plain-text @handle, no p-tag. Honest by design — no fabricated
    // notification (NIP-27 tags are optional, "may choose not to include").
    return `@${clean}`;
  }

  private extractMentionedPubkeys(content: string): string[] {
    const out = new Set<string>();
    if (!content) return [];
    const patterns = [
      /nostr:(npub1[0-9a-z]+|nprofile1[0-9a-z]+)/gi,
      // @? catches X-style insertion `@npub1...` when the composer bypasses
      // mentionFormat (F6 defense-in-depth).
      /(?:^|\s)@?(npub1[0-9a-z]+|nprofile1[0-9a-z]+)/gi,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(content))) {
        const hex = this.decodeNpubToHex(m[1].toLowerCase());
        if (hex) out.add(hex.toLowerCase());
      }
    }
    return [...out];
  }

  private buildContent(post: PostDetails): string {
    const mediaContent = post.media?.map((m) => m.path).join('\n\n') || '';
    return mediaContent
      ? `${post.message}\n\n${mediaContent}`
      : post.message;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const { password } = AuthService.verifyJWT(accessToken) as any;
    // F5: collect p-tags across the whole thread (not just firstPost), capped.
    const allHex = new Set<string>();
    for (const entry of postDetails) {
      for (const hex of this.extractMentionedPubkeys(
        this.buildContent(entry)
      )) {
        if (allHex.size >= MAX_MENTION_TAGS) break;
        allHex.add(hex);
      }
      if (allHex.size >= MAX_MENTION_TAGS) break;
    }
    const pTags = [...allHex].map((hex) => ['p', hex]);
    const [firstPost] = postDetails;
    const content = this.buildContent(firstPost);

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content,
        tags: [...pTags],
        created_at: Math.floor(Date.now() / 1000),
      },
      this.secretKey(password)
    );

    const eventId = await this.publish(id, textEvent);

    return [
      {
        id: firstPost.id,
        postId: String(eventId),
        releaseURL: `https://primal.net/e/${eventId}`,
        status: 'completed',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { password } = AuthService.verifyJWT(accessToken) as any;
    const [commentPost] = postDetails;
    const replyToId = lastCommentId || postId;
    const content = this.buildContent(commentPost);
    // F5 guard: id may be missing/non-hex — filter so self-dedup is not a no-op.
    const seen = new Set(
      [id]
        .filter(
          (x): x is string =>
            typeof x === 'string' && /^[0-9a-f]{64}$/i.test(x)
        )
        .map((x) => x.toLowerCase())
    );
    const mentionTags = this.extractMentionedPubkeys(content)
      .filter((hex) => !seen.has(hex))
      .slice(0, MAX_MENTION_TAGS)
      .map((hex) => ['p', hex]);

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content,
        tags: [
          ['e', replyToId, '', 'reply'],
          ['p', id],
          ...mentionTags,
        ],
        created_at: Math.floor(Date.now() / 1000),
      },
      this.secretKey(password)
    );

    const eventId = await this.publish(id, textEvent);

    return [
      {
        id: commentPost.id,
        postId: String(eventId),
        releaseURL: `https://primal.net/e/${eventId}`,
        status: 'completed',
      },
    ];
  }
}
