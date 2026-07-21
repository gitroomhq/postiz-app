import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, Relay, finalizeEvent, SimplePool, nip19 } from 'nostr-tools';

import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
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

const pool = new SimplePool();

export class NostrProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5;
  identifier = 'nostr';
  name = 'Nostr';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;
  toolTip = 'Make sure you private a HEX key of your Nostr private key, you can get it from websites like iris.to'

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


  /**
   * Nostr profile mention autocomplete (NIP-01 kind:0 + NIP-50 search when supported).
   * Returns candidates for the TipTap mention dropdown.
   */
  override async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ) {
    const q = (d?.query || '').trim();
    if (!q || q.length < 2) {
      return [];
    }

    const results: { id: string; label: string; image: string; doNotCache?: boolean }[] = [];
    const seen = new Set<string>();

    const pushProfile = (pubkey: string, content: any) => {
      if (!pubkey || seen.has(pubkey)) return;
      seen.add(pubkey);
      const label =
        content?.display_name ||
        content?.displayName ||
        content?.name ||
        content?.username ||
        pubkey.slice(0, 12);
      results.push({
        id: pubkey,
        label: String(label),
        image: content?.picture || content?.image || '',
      });
    };

    // Resolve direct npub / hex pubkey queries first
    try {
      let pubkey = '';
      if (q.startsWith('npub1')) {
        const decoded = nip19.decode(q);
        if (decoded.type === 'npub') pubkey = decoded.data as string;
      } else if (/^[0-9a-fA-F]{64}$/.test(q)) {
        pubkey = q.toLowerCase();
      }
      if (pubkey) {
        const info = await this.findRelayInformation(pubkey);
        pushProfile(pubkey, info || {});
        return results;
      }
    } catch {
      /* continue to search */
    }

    // NIP-50 search across relays (best-effort; relays without search simply return nothing)
    try {
      const events = await Promise.race([
        pool.querySync(list, {
          kinds: [0],
          search: q,
          limit: 12,
        } as any),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 4500)),
      ]);

      for (const evt of events || []) {
        let content: any = {};
        try {
          content = JSON.parse(evt.content || '{}');
        } catch {
          content = {};
        }
        // client-side filter in case relay ignored search
        const hay = `${content.display_name || ''} ${content.displayName || ''} ${
          content.name || ''
        } ${content.nip05 || ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase()) && events.length > 3) {
          // still include if relay returned it as a search hit with empty metadata
          if (!content.name && !content.display_name && !content.displayName) {
            pushProfile(evt.pubkey, content);
          }
        } else {
          pushProfile(evt.pubkey, content);
        }
      }
    } catch (err) {
      console.log('Nostr mention search error', err);
    }

    return results.slice(0, 12);
  }

  /**
   * NIP-27 unencoded mention form using npub bech32 for portable text.
   * Post pipeline also extracts p-tags for mentioned pubkeys.
   */
  mentionFormat(idOrHandle: string, name: string) {
    try {
      if (idOrHandle.startsWith('npub1')) {
        return `nostr:${idOrHandle}`;
      }
      if (/^[0-9a-fA-F]{64}$/.test(idOrHandle)) {
        return `nostr:${nip19.npubEncode(idOrHandle.toLowerCase())}`;
      }
    } catch {
      /* fall through */
    }
    return `@${name || idOrHandle}`;
  }

  /** Extract hex pubkeys from NIP-27 nostr:npub mentions in message body. */
  private extractMentionedPubkeys(message: string): string[] {
    const pubkeys: string[] = [];
    const re = /nostr:(npub1[0-9a-z]+)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(message || '')) !== null) {
      try {
        const decoded = nip19.decode(m[1]);
        if (decoded.type === 'npub') {
          pubkeys.push(decoded.data as string);
        }
      } catch {
        /* skip bad bech32 */
      }
    }
    return [...new Set(pubkeys)];
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
    const [firstPost] = postDetails;

    const content = this.buildContent(firstPost);
    const mentionTags = this.extractMentionedPubkeys(content).map(
      (pk) => ['p', pk] as [string, string]
    );

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content,
        tags: mentionTags,
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

    const commentContent = this.buildContent(commentPost);
    const mentionTags = this.extractMentionedPubkeys(commentContent).map(
      (pk) => ['p', pk] as [string, string]
    );
    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content: commentContent,
        tags: [
          ['e', replyToId, '', 'reply'],
          ['p', id],
          ...mentionTags,
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
