import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import {
  getPublicKey,
  Relay,
  finalizeEvent,
  SimplePool,
  nip19,
} from 'nostr-tools';

import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { getSsrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import { Integration } from '@prisma/client';

// @ts-ignore
global.WebSocket = WebSocket;

const list = [
  'wss://nos.lol',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://temp.iris.to',
  'wss://vault.iris.to',
];

// Relays that support NIP-50 (keyword search over kind:0 profile events).
// Live-probed 2026-08-26: search.nos.today responds ~1s; relay.nostr.band kept
// as fallback (works in some regions); nos.lol/damus ignore `search`.
const searchRelays = [
  ...new Set([...list, 'wss://relay.nostr.band', 'wss://search.nos.today']),
];

const pool = new SimplePool();

export class NostrProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5;
  identifier = 'nostr';
  name = 'Nostr';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  toolTip =
    'Make sure you private a HEX key of your Nostr private key, you can get it from websites like iris.to';

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
    const state = makeId(17);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
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

      const pubkey = getPublicKey(
        Uint8Array.from(
          body.password.match(/.{1,2}/g).map((byte: any) => parseInt(byte, 16))
        )
      );

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

  private buildContent(post: PostDetails): string {
    const mediaContent = post.media?.map((m) => m.path).join('\n\n') || '';
    return mediaContent ? `${post.message}\n\n${mediaContent}` : post.message;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const { password } = AuthService.verifyJWT(accessToken) as any;
    const [firstPost] = postDetails;

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content: this.buildContent(firstPost),
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      password
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

  /**
   * Profile autocomplete for the composer (@mention).
   * Two strategies, merged:
   *  1. Direct NIP-05 lookup when the query looks like `user@domain` / `domain.tld`
   *  2. NIP-50 keyword search over kind:0 metadata events on search-capable relays
   * Returns { id, label, image }; `id` is a NIP-05 handle when known, else an npub.
   */
  override async mention(
    token: string,
    d: { query: string }
  ): Promise<{ id: string; label: string; image: string }[]> {
    const query = (d?.query || '').trim();
    if (query.length < 2) {
      return [];
    }

    const results: { id: string; label: string; image: string }[] = [];
    const seen = new Set<string>();

    const pushProfile = (
      pubkey: string,
      content: any,
      fallbackLabel?: string
    ) => {
      if (!pubkey || seen.has(pubkey)) {
        return;
      }

      const name =
        content?.display_name || content?.displayName || content?.name || '';
      if (!name && !fallbackLabel) {
        return;
      }

      seen.add(pubkey);
      const npub = nip19.npubEncode(pubkey);
      results.push({
        id: content?.nip05 || npub,
        label: name || fallbackLabel!,
        image: content?.picture || '',
      });
    };

    // 1) NIP-05 direct verification for domain-shaped queries
    const nip05Match = query.match(/^([\w-.]+)@([\w-.]+\.[a-zA-Z]{2,})$/);
    const domainOnly =
      !nip05Match && /^[\w-]+\.[\w-]+\.[a-zA-Z]{2,}$/.test(query);
    if (nip05Match || domainOnly) {
      try {
        const [localPart, domainPart] = nip05Match
          ? [nip05Match[1], nip05Match[2]]
          : ['_', query];
        const response = await fetch(
          `https://${domainPart}/.well-known/nostr.json?name=${encodeURIComponent(
            localPart
          )}`,
          {
            signal: AbortSignal.timeout(5000),
            // @ts-ignore - undici-only option; pins DNS + blocks SSRF to
            // internal/private IPs (same guard as mastodon/wordpress providers)
            dispatcher: getSsrfSafeDispatcher(),
          }
        );

        if (response.ok) {
          const wellKnown = (await response.json()) as {
            names?: Record<string, string>;
          };
          const names = Object.entries(wellKnown.names || {});

          for (const [name, pubkey] of names.slice(0, 8)) {
            // Wildcard '_' entries have no profile event to parse; still useful
            if (names.length === 1 && localPart === '_') {
              pushProfile(pubkey, {}, name);
              continue;
            }

            try {
              const meta = await pool.get(list, {
                kinds: [0],
                authors: [pubkey],
                limit: 1,
              });
              let content: any = {};
              try {
                content = JSON.parse(meta?.content || '{}');
              } catch {
                /**empty*/
              }
              pushProfile(pubkey, content, name);
            } catch {
              pushProfile(pubkey, {}, name);
            }
          }
        }
      } catch (err) {
        /** NIP-05 lookup failed - fall through to relay search */
      }
    }

    // 2) NIP-50 keyword search over profile metadata events
    if (results.length < 8) {
      try {
        const events = await pool.querySync(
          searchRelays,
          {
            kinds: [0],
            search: query,
            limit: 10,
          },
          { maxWait: 8000 }
        );

        for (const evt of events || []) {
          if (results.length >= 8) {
            break;
          }

          let content: any = {};
          try {
            content = JSON.parse(evt.content || '{}');
          } catch {
            continue;
          }
          pushProfile(evt.pubkey, content);
        }
      } catch (err) {
        console.log(err);
      }
    }

    return results;
  }

  mentionFormat(idOrHandle: string, name: string) {
    return `@${idOrHandle || name}`;
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

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content: this.buildContent(commentPost),
        tags: [
          ['e', replyToId, '', 'reply'],
          ['p', id],
        ],
        created_at: Math.floor(Date.now() / 1000),
      },
      password
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
