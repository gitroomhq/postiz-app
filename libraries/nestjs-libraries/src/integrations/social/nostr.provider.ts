import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { getPublicKey, Relay, finalizeEvent } from 'nostr-tools';
import WebSocket from 'ws';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

// @ts-ignore
global.WebSocket = WebSocket;

const list = [
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://nostr.wine',
  'wss://nos.lol',
  'wss://relay.primal.net',
];

export class NostrProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 5; // Nostr relays typically have generous limits
  identifier = 'nostr';
  name = 'Nostr';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;

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
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  private async findRelayInformation(pubkey: string) {
    for (const relay of list) {
      const relayInstance = await Relay.connect(relay);
      const value = await new Promise<any>((resolve) => {
        console.log('connecting');
        relayInstance.subscribe([{ kinds: [0], authors: [pubkey] }], {
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

      relayInstance.close();
      const content = JSON.parse(value?.content || '{}');
      if (content.name || content.displayName || content.display_name) {
        return content;
      }
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
        id: String(user.pubkey),
        name: user.display_name || user.displayName || 'No Name',
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const { password } = AuthService.verifyJWT(accessToken) as any;

    let lastId = '';
    const ids: PostResponse[] = [];
    for (const post of postDetails) {
      const textEvent = finalizeEvent(
        {
          kind: 1, // Text note
          content:
            post.message + '\n\n' + post.media?.map((m) => m.path).join('\n\n'),
          tags: [
            ...(lastId
              ? [
                  ['e', lastId, '', 'reply'],
                  ['p', id],
                ]
              : []),
          ], // Include delegation token in the event
          created_at: Math.floor(Date.now() / 1000),
        },
        password
      );

      lastId = await this.publish(id, textEvent);
      ids.push({
        id: post.id,
        postId: String(lastId),
        releaseURL: `https://primal.net/e/${lastId}`,
        status: 'completed',
      });
    }

    return ids;
  }
}
