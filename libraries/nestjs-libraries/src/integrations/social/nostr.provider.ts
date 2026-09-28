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


  private profileLabel(content: Record<string, any>, pubkey: string) {
    return (
      content.display_name ||
      content.displayName ||
      content.name ||
      pubkey.slice(0, 12)
    );
  }

  private async profileMention(pubkey: string) {
    const evt = await this.findRelayInformation(pubkey);
    return {
      id: pubkey,
      label: this.profileLabel(evt, pubkey),
      image: evt?.picture || '',
    };
  }

  private decodePubkey(query: string): string | null {
    const q = query.trim();
    if (/^[0-9a-f]{64}$/i.test(q)) {
      return q.toLowerCase();
    }
    try {
      const decoded = nip19.decode(q);
      if (decoded.type === 'npub') {
        return decoded.data as string;
      }
      if (decoded.type === 'nprofile') {
        return (decoded.data as { pubkey: string }).pubkey;
      }
    } catch {
      /** empty **/
    }
    return null;
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

  private buildContent(post: PostDetails): string {
    const mediaContent = post.media?.map((m) => m.path).join('\n\n') || '';
    return mediaContent
      ? `${post.message}\n\n${mediaContent}`
      : post.message;
  }


  override async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ) {
    const query = (d?.query || '').trim();
    if (!query) {
      return [];
    }

    const direct = this.decodePubkey(query);
    if (direct) {
      try {
        return [await this.profileMention(direct)];
      } catch {
        return [
          {
            id: direct,
            label: direct.slice(0, 12),
            image: '',
          },
        ];
      }
    }

    // NIP-50 text search across configured relays for kind-0 profiles.
    let events: any[] = [];
    try {
      events = await Promise.race([
        pool.querySync(list, {
          kinds: [0],
          search: query,
          limit: 12,
        } as any),
        new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 4500)),
      ]);
    } catch {
      events = [];
    }

    const byPubkey = new Map<string, { id: string; label: string; image: string }>();
    for (const evt of events || []) {
      if (!evt?.pubkey || byPubkey.has(evt.pubkey)) continue;
      let content: Record<string, any> = {};
      try {
        content = JSON.parse(evt.content || '{}');
      } catch {
        content = {};
      }
      const label = this.profileLabel(content, evt.pubkey);
      const hay = `${label} ${content.name || ''} ${content.nip05 || ''}`.toLowerCase();
      if (!hay.includes(query.toLowerCase()) && !(content.nip05 || '').toLowerCase().includes(query.toLowerCase())) {
        // Keep NIP-50 hits even if local string match fails; search relays already ranked them.
      }
      byPubkey.set(evt.pubkey, {
        id: evt.pubkey,
        label,
        image: content.picture || '',
      });
      if (byPubkey.size >= 8) break;
    }

    return Array.from(byPubkey.values());
  }

  mentionFormat(idOrHandle: string, name: string) {
    try {
      if (/^[0-9a-f]{64}$/i.test(idOrHandle)) {
        return `nostr:${nip19.npubEncode(idOrHandle.toLowerCase())}`;
      }
      if (idOrHandle.startsWith('npub1') || idOrHandle.startsWith('nprofile1')) {
        return `nostr:${idOrHandle}`;
      }
    } catch {
      /** empty **/
    }
    return name?.startsWith('@') ? name : `@${name || idOrHandle}`;
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
