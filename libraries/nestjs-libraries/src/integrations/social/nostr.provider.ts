import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, Relay, finalizeEvent, nip19, SimplePool } from 'nostr-tools';

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

  private buildContent(post: PostDetails): string {
    const mediaContent = post.media?.map((m) => m.path).join('\n\n') || '';
    return mediaContent
      ? `${post.message}\n\n${mediaContent}`
      : post.message;
  }

  private decodeMentionPubkey(value: string): string | undefined {
    const normalized = value.trim().replace(/^@/, '');

    if (/^[0-9a-f]{64}$/i.test(normalized)) {
      return normalized.toLowerCase();
    }

    if (!normalized.toLowerCase().startsWith('npub1')) {
      return undefined;
    }

    try {
      const decoded = nip19.decode(normalized);

      if (decoded.type === 'npub' && typeof decoded.data === 'string') {
        return decoded.data.toLowerCase();
      }
    } catch {
      return undefined;
    }

    return undefined;
  }

  private mapProfileEvent(event: {
    pubkey: string;
    content?: string;
    created_at?: number;
  }) {
    let metadata: Record<string, unknown> = {};

    try {
      metadata = JSON.parse(event.content || '{}');
    } catch {
      metadata = {};
    }

    const displayName = String(
      metadata.display_name ||
        metadata.displayName ||
        metadata.name ||
        nip19.npubEncode(event.pubkey).slice(0, 16)
    );

    const username = String(metadata.name || metadata.nip05 || displayName);
    const picture = String(metadata.picture || metadata.image || '');

    return {
      id: event.pubkey,
      label:
        username === displayName
          ? displayName
          : `${displayName} (${username})`,
      image: picture,
      doNotCache: true,
      createdAt: event.created_at || 0,
    };
  }

  override async mention(
    token: string,
    data: { query: string },
    id: string,
    integration: Integration
  ) {
    const query = data.query.trim();

    if (query.length < 2) {
      return [];
    }

    const directPubkey = this.decodeMentionPubkey(query);
    let events: {
      pubkey: string;
      content?: string;
      created_at?: number;
    }[] = [];

    if (directPubkey) {
      const profile = await pool.get(list, {
        kinds: [0],
        authors: [directPubkey],
        limit: 1,
      });

      if (profile) {
        events = [profile];
      }
    } else {
      events = await pool.querySync(list, {
        kinds: [0],
        search: query,
        limit: 40,
      });
    }

    const normalizedQuery = query.toLowerCase();

    const profiles = events
      .map((event) => this.mapProfileEvent(event))
      .filter((profile) => {
        const searchable = `${profile.label} ${profile.id}`.toLowerCase();
        return Boolean(directPubkey) || searchable.includes(normalizedQuery);
      })
      .sort((left, right) => right.createdAt - left.createdAt);

    const uniqueProfiles = new Map<string, (typeof profiles)[number]>();

    for (const profile of profiles) {
      if (!uniqueProfiles.has(profile.id)) {
        uniqueProfiles.set(profile.id, profile);
      }
    }

    return Array.from(uniqueProfiles.values())
      .slice(0, 20)
      .map(({ createdAt, ...profile }) => profile);
  }

  mentionFormat(idOrHandle: string, name: string) {
    const pubkey = this.decodeMentionPubkey(idOrHandle);

    if (!pubkey) {
      return `@${name}`;
    }

    return `nostr:${nip19.npubEncode(pubkey)}`;
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
