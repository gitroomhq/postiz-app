import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, Relay, finalizeEvent, SimplePool } from 'nostr-tools';

import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';
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

  /** Convert a stored hex private key into the Uint8Array nostr-tools expects. */
  private toSecretKey(password: string): Uint8Array {
    return Uint8Array.from(
      password.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
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

  /**
   * Publish an event to all configured relays without waiting for a
   * subscription match. Prefer this when `finalizeEvent` already gave us a
   * deterministic event id (posts, comments, reposts).
   */
  private async broadcast(event: any): Promise<void> {
    await Promise.allSettled(
      list.map(async (relayUrl) => {
        try {
          const relayInstance = await Relay.connect(relayUrl);
          try {
            await relayInstance.publish(event);
          } finally {
            relayInstance.close();
          }
        } catch {
          /** empty **/
        }
      })
    );
  }

  private async publish(pubkey: string, event: any) {
    // finalizeEvent always stamps a deterministic id — prefer it over
    // waiting for relays to echo the event back (which often times out).
    if (event?.id) {
      await this.broadcast(event);
      return event.id as string;
    }

    let id = '';
    for (const relay of list) {
      try {
        const relayInstance = await Relay.connect(relay);
        const value = new Promise<any>((resolve) => {
          relayInstance.subscribe(
            [{ kinds: [event?.kind ?? 1], authors: [pubkey] }],
            {
              eoseTimeout: 6000,
              onevent: (observed) => {
                resolve(observed);
              },
              oneose: () => {
                resolve({});
              },
              onclose: () => {
                resolve({});
              },
            }
          );
        });

        await relayInstance.publish(event);
        const all = await value;
        relayInstance.close();
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
    const secretKey = this.toSecretKey(password);
    const [firstPost] = postDetails;

    const textEvent = finalizeEvent(
      {
        kind: 1, // Text note
        content: this.buildContent(firstPost),
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      },
      secretKey
    );

    // Use the finalized event id — publish() may return empty when relays
    // time out, which would break multi-account reposts that need postId.
    await this.publish(id, textEvent);
    const eventId = String(textEvent.id);

    return [
      {
        id: firstPost.id,
        postId: eventId,
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
    const secretKey = this.toSecretKey(password);
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
      secretKey
    );

    await this.publish(id, textEvent);
    const eventId = String(textEvent.id);

    return [
      {
        id: commentPost.id,
        postId: eventId,
        releaseURL: `https://primal.net/e/${eventId}`,
        status: 'completed',
      },
    ];
  }

  /**
   * Multi-account crosspost: when composing a Nostr post, pick other connected
   * Nostr integrations to repost it (same "Add Re-posters" PostPlug as X/LinkedIn).
   * Publishes a NIP-18 kind:6 repost signed by each selected account.
   */
  @PostPlug({
    identifier: 'nostr-repost-post-users',
    title: 'Add Re-posters',
    description: 'Add accounts to repost your post',
    pickIntegration: ['nostr'],
    fields: [],
  })
  async repostPostUsers(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    _information: any
  ) {
    if (!postId) {
      return;
    }

    try {
      const { password } = AuthService.verifyJWT(integration.token) as any;
      const secretKey = this.toSecretKey(password);

      // NIP-18 repost: kind 6, empty content, e = note id (+ relay hint), p = author.
      const repostEvent = finalizeEvent(
        {
          kind: 6,
          content: '',
          tags: [
            ['e', postId, list[0]],
            ['p', originalIntegration.internalId],
          ],
          created_at: Math.floor(Date.now() / 1000),
        },
        secretKey
      );

      // Fire-and-forget broadcast — no kind:1 subscription wait (repost is kind 6).
      await this.broadcast(repostEvent);
    } catch {
      // Mirror X: swallow failures so one bad account does not fail the post.
    }
  }
}
