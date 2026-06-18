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
  type Event as NostrEvent,
} from 'nostr-tools';

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
const PROFILE_SEARCH_LIMIT = 40;
const PROFILE_SEARCH_WAIT_MS = 2500;

type MentionResult = {
  id: string;
  label: string;
  image: string;
  doNotCache?: boolean;
};

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

  private decodePublicKey(value: string) {
    const candidate = value.trim().replace(/^nostr:/i, '');

    if (/^[a-f0-9]{64}$/i.test(candidate)) {
      return candidate.toLowerCase();
    }

    if (!candidate.toLowerCase().startsWith('npub1')) {
      return undefined;
    }

    try {
      const decoded = nip19.decode(candidate);
      return decoded.type === 'npub' ? decoded.data : undefined;
    } catch {
      return undefined;
    }
  }

  private parseProfile(event: NostrEvent) {
    try {
      return JSON.parse(event.content || '{}');
    } catch {
      return {};
    }
  }

  private profileMatches(profile: any, query: string, pubkey: string) {
    const npub = nip19.npubEncode(pubkey);
    const searchable = [
      npub,
      pubkey,
      profile.name,
      profile.displayName,
      profile.display_name,
      profile.username,
      profile.nip05,
      profile.about,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(query.toLowerCase());
  }

  private profileToMention(event: NostrEvent): MentionResult {
    const profile = this.parseProfile(event);
    const npub = nip19.npubEncode(event.pubkey);
    const label =
      profile.display_name ||
      profile.displayName ||
      profile.name ||
      profile.username ||
      profile.nip05 ||
      `${npub.slice(0, 12)}...`;

    return {
      id: npub,
      label,
      image: profile.picture || profile.image || '',
    };
  }

  private extractMentionTags(content: string) {
    const tags = new Map<string, string[]>();
    const matches = content.match(/(?:nostr:)?npub1[0-9a-z]+/gi) || [];

    for (const match of matches) {
      const pubkey = this.decodePublicKey(match);
      if (pubkey) {
        tags.set(pubkey, ['p', pubkey]);
      }
    }

    return Array.from(tags.values());
  }

  private dedupeTags(tags: string[][]) {
    const seen = new Set<string>();

    return tags.filter((tag) => {
      const key = tag.join(':');
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  override async mention(_token: string, d: { query: string }) {
    const query = (d?.query || '').trim();

    if (query.length < 2) {
      return [];
    }

    const exactPubkey = this.decodePublicKey(query);

    try {
      const events = exactPubkey
        ? [
            await pool.get(
              list,
              {
                kinds: [0],
                authors: [exactPubkey],
                limit: 1,
              },
              { maxWait: PROFILE_SEARCH_WAIT_MS }
            ),
          ].filter(Boolean)
        : await pool.querySync(
            list,
            {
              kinds: [0],
              search: query,
              limit: PROFILE_SEARCH_LIMIT,
            },
            { maxWait: PROFILE_SEARCH_WAIT_MS }
          );

      const mentions = new Map<string, MentionResult>();

      for (const event of events as NostrEvent[]) {
        const profile = this.parseProfile(event);
        if (exactPubkey || this.profileMatches(profile, query, event.pubkey)) {
          const mention = this.profileToMention(event);
          mentions.set(mention.id, mention);
        }
      }

      if (exactPubkey && !mentions.size) {
        const npub = nip19.npubEncode(exactPubkey);
        mentions.set(npub, {
          id: npub,
          label: `${npub.slice(0, 12)}...`,
          image: '',
          doNotCache: true,
        });
      }

      return Array.from(mentions.values()).slice(0, 10);
    } catch (err) {
      console.log(err);
      return [];
    }
  }

  mentionFormat(idOrHandle: string) {
    const pubkey = this.decodePublicKey(idOrHandle);

    if (!pubkey) {
      return `nostr:${idOrHandle}`;
    }

    return `nostr:${nip19.npubEncode(pubkey)}`;
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const { password } = AuthService.verifyJWT(accessToken) as any;
    const [firstPost] = postDetails;
    const content = this.buildContent(firstPost);

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content,
        tags: this.extractMentionTags(content),
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
    const content = this.buildContent(commentPost);

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content,
        tags: this.dedupeTags([
          ['e', replyToId, '', 'reply'],
          ['p', id],
          ...this.extractMentionTags(content),
        ]),
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
