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

// Relays that support NIP-50 profile search
const searchList = ['wss://relay.nostr.band', 'wss://search.nos.today'];

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

  // NIP-27: every "nostr:npub1..." reference in the content should also be
  // tagged with a "p" tag so mentioned users get notified by their clients.
  private mentionedPubkeysTags(
    content: string,
    exclude: string[] = []
  ): string[][] {
    const seen = new Set<string>(exclude);
    const tags: string[][] = [];

    for (const [, npub] of content.matchAll(/nostr:(npub1[a-z0-9]+)/g)) {
      try {
        const decoded = nip19.decode(npub);
        if (decoded.type !== 'npub' || seen.has(decoded.data)) {
          continue;
        }

        seen.add(decoded.data);
        tags.push(['p', decoded.data]);
      } catch (err) {
        /**empty**/
      }
    }

    return tags;
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
        tags: this.mentionedPubkeysTags(content),
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
        tags: [
          ['e', replyToId, '', 'reply'],
          ['p', id],
          ...this.mentionedPubkeysTags(content, [id]),
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

  override async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ) {
    try {
      // NIP-50 profile search (kind 0 metadata events)
      const events = await pool.querySync(
        searchList,
        { kinds: [0], search: d.query, limit: 30 },
        { maxWait: 3000 }
      );

      const latestByAuthor = new Map<string, (typeof events)[number]>();
      for (const event of events || []) {
        const current = latestByAuthor.get(event.pubkey);
        if (!current || event.created_at > current.created_at) {
          latestByAuthor.set(event.pubkey, event);
        }
      }

      const users: { id: string; label: string; image: string }[] = [];
      for (const event of latestByAuthor.values()) {
        let content: any = {};
        try {
          content = JSON.parse(event.content || '{}');
        } catch {
          continue;
        }

        const name =
          content.display_name || content.displayName || content.name;
        if (!name) {
          continue;
        }

        users.push({
          id: nip19.npubEncode(event.pubkey),
          label: String(name),
          image: content.picture || '',
        });
      }

      return users.slice(0, 10);
    } catch (err) {
      console.log(err);
    }

    return [];
  }

  mentionFormat(idOrHandle: string, name: string) {
    // NIP-27 inline mention, resolved by Nostr clients to the profile
    return `nostr:${idOrHandle}`;
  }
}
