import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, nip19, Relay, finalizeEvent, SimplePool } from 'nostr-tools';

import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { Integration } from '@prisma/client';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';

/**
 * Convert a hex string (64-char hex private key or pubkey) to Uint8Array.
 * Required because nostr-tools finalizeEvent/getPublicKey expect Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match) return new Uint8Array();
  return Uint8Array.from(match.map((byte: string) => parseInt(byte, 16)));
}

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
      hexToBytes(password) // #1610: finalizeEvent expects Uint8Array, not hex string
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
      hexToBytes(password) // #1610: finalizeEvent expects Uint8Array, not hex string
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

  /**
   * #1603 - Nostr mention autocomplete in composer.
   * Searches Nostr profiles using the nostr.band search API,
   * which indexes kind-0 metadata events from public relays.
   * Returns results in the format expected by the mention autocomplete UI.
   */
  override async mention(
    token: string,
    d: { query: string }
  ): Promise<
    | { id: string; label: string; image: string; doNotCache?: boolean }[]
    | { none: true }
  > {
    if (!d.query || d.query.length < 2) return [];

    try {
      const response = await fetch(
        `https://api.nostr.band/nostr?search=${encodeURIComponent(d.query)}&kind=0`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return [];

      const data = await response.json() as {
        profiles?: Array<{
          pubkey: string;
          content: string;
        }>;
      };

      if (!data?.profiles?.length) return [];

      return data.profiles
        .map((profile) => {
          let content: Record<string, string> = {};
          try {
            content = JSON.parse(profile.content);
          } catch {
            return null;
          }

          const label =
            content.display_name ||
            content.name ||
            content.displayName ||
            '';
          const image = content.picture || '';

          if (!label) return null;

          return {
            id: profile.pubkey,
            label,
            image,
          };
        })
        .filter((p): p is { id: string; label: string; image: string } => p !== null)
        .slice(0, 20);
    } catch (err) {
      console.error('Error searching Nostr profiles:', err);
      return [];
    }
  }

  /**
   * #1603 - Format a Nostr mention for insertion into the post body.
   * Uses NIP-27 style nostr:npub... references for maximum relay compatibility.
   */
  mentionFormat(idOrHandle: string, name: string) {
    try {
      const npub = nip19.npubEncode(idOrHandle);
      return `nostr:${npub}`;
    } catch {
      return `@${idOrHandle.slice(0, 12)}`;
    }
  }

  /**
   * #1586 - Auto-repost posts when they receive enough reactions (kind-7 likes).
   * Mirrors the X autoRepostPost plug behavior.
   */
  @Plug({
    identifier: 'nostr-autoRepostPost',
    title: 'Auto Repost Posts',
    description:
      'When a post receives a certain number of reactions (zaps + likes), repost it to increase engagement',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'reactionsAmount',
        type: 'number',
        placeholder: 'Amount of reactions',
        description:
          'The amount of reactions (kind-7 likes + zaps) to trigger the repost',
        validation: /^\d+$/,
      },
    ],
  })
  async autoRepostPost(
    integration: Integration,
    id: string,
    fields: { reactionsAmount: string }
  ) {
    const { password } = AuthService.verifyJWT(integration.token) as any;
    const pubkey = getPublicKey(hexToBytes(password));

    // Find the user's recent posts (kind 1 events authored by this pubkey)
    const recentPosts = await pool.get(list, {
      kinds: [1],
      authors: [pubkey],
      limit: 10,
    });

    if (!recentPosts?.id) return false;

    // Query kind-7 reactions on this post
    const reactions = await pool.get(list, {
      kinds: [7],
      '#e': [recentPosts.id],
      limit: 100,
    });

    const reactionCount =
      reactions?.kind === 7 ? 1 : 0;

    if (reactionCount >= +fields.reactionsAmount) {
      // Publish a kind-6 repost
      const repostEvent = finalizeEvent(
        {
          kind: 6,
          content: JSON.stringify(recentPosts),
          tags: [
            ['e', recentPosts.id, '', 'mention'],
            ['p', pubkey],
          ],
          created_at: Math.floor(Date.now() / 1000),
        },
        hexToBytes(password)
      );

      await this.publish(pubkey, repostEvent);
      return true;
    }

    return false;
  }
}
