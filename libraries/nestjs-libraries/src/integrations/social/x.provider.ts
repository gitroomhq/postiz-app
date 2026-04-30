import { TweetV2, TwitterApi } from 'twitter-api-v2';
import {
  AnalyticsData,
  AuthTokenDetails,
  ClientInformation,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { lookup } from 'mime-types';
import sharp from 'sharp';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { Integration } from '@prisma/client';
import { timer } from '@gitroom/helpers/utils/timer';
import { PostPlug } from '@gitroom/helpers/decorators/post.plug';
import dayjs from 'dayjs';
import { uniqBy } from 'lodash';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { AuthService } from '@gitroom/helpers/auth/auth.service';

@Rules(
  'X can have maximum 4 pictures, or maximum one video, it can also be without attachments'
)
export class XProvider extends SocialAbstract implements SocialProvider {
  identifier = 'x';
  name = 'X';
  isBetweenSteps = false;
  scopes = [] as string[];
  override maxConcurrentJob = 1; // X has strict rate limits (300 posts per 3 hours)
  toolTip =
    'You will be logged in into your current account, if you would like a different account, change it first on X';

  editor = 'normal' as const;
  dto = XDto;

  maxLength(isTwitterPremium: boolean) {
    return isTwitterPremium ? 4000 : 200;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    if (body.includes('Unsupported Authentication')) {
      return {
        type: 'refresh-token',
        value: 'X authentication has expired, please reconnect your account',
      };
    }

    if (
      body.includes('CreditsDepleted') ||
      body.includes('/2/problems/credits')
    ) {
      return {
        type: 'bad-body',
        value:
          'X: creditos da API esgotados. Verifique o tier do seu app em developer.x.com (o tier Free tem cota mensal muito limitada para criacao de tweets).',
      };
    }

    if (body.includes('usage-capped')) {
      return {
        type: 'bad-body',
        value: 'Posting failed - capped reached. Please try again later',
      };
    }
    if (body.includes('duplicate-rules')) {
      return {
        type: 'bad-body',
        value:
          'You have already posted this post, please wait before posting again',
      };
    }
    if (body.includes('The Tweet contains an invalid URL.')) {
      return {
        type: 'bad-body',
        value: 'The Tweet contains a URL that is not allowed on X',
      };
    }
    if (
      body.includes(
        'This user is not allowed to post a video longer than 2 minutes'
      )
    ) {
      return {
        type: 'bad-body',
        value:
          'The video you are trying to post is longer than 2 minutes, which is not allowed for this account',
      };
    }
    if (
      body.includes('Tweet text is too long') ||
      body.includes('Tweet needs to be a bit shorter') ||
      body.includes('exceeds the maximum number of characters')
    ) {
      return {
        type: 'bad-body',
        value:
          'O texto do tweet excedeu o limite de caracteres do X. Reduza o conteudo (limite de 280 chars no contador weighted, com — e … contando como 2) e tente novamente.',
      };
    }
    if (
      body.includes('paid_partnership') &&
      (body.includes('not allowed') ||
        body.includes('not authorized') ||
        body.includes('Forbidden'))
    ) {
      return {
        type: 'bad-body',
        value:
          'X: sua conta nao tem permissao para marcar paid_partnership (parceria paga). Desmarque essa opcao no post e tente novamente.',
      };
    }
    return undefined;
  }

  /**
   * Monta o payload final aceito pelo client.v2.tweet, omitindo campos
   * opcionais quando nao usados — alguns campos como `made_with_ai` e
   * `paid_partnership` podem ser rejeitados pela API quando enviados em
   * contas sem o feature habilitado, entao so incluimos quando true.
   */
  buildTweetPayload(input: {
    text: string;
    media_ids: string[];
    settings: {
      who_can_reply_post?:
        | 'everyone'
        | 'following'
        | 'mentionedUsers'
        | 'subscribers'
        | 'verified';
      community?: string;
      made_with_ai?: boolean;
      paid_partnership?: boolean;
    };
    replyToId?: string;
  }) {
    const { text, media_ids, settings, replyToId } = input;
    const payload: any = { text };

    if (
      settings.who_can_reply_post &&
      settings.who_can_reply_post !== 'everyone'
    ) {
      payload.reply_settings = settings.who_can_reply_post;
    }

    if (settings.community) {
      payload.share_with_followers = true;
      payload.community_id = settings.community.split('/').pop() || '';
    }

    if (media_ids.length) {
      payload.media = { media_ids };
    }

    if (settings.made_with_ai) {
      payload.made_with_ai = true;
    }

    if (settings.paid_partnership) {
      payload.paid_partnership = true;
    }

    if (replyToId) {
      payload.reply = { in_reply_to_tweet_id: replyToId };
    }

    return payload;
  }

  @Plug({
    identifier: 'x-autoRepostPost',
    title: 'Auto Repost Posts',
    disabled: !!process.env.DISABLE_X_ANALYTICS,
    description:
      'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
    ],
  })
  async autoRepostPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string }
  ) {
    const client = await this.getClient(integration.token, integration);

    if (
      (await client.v2.tweetLikedBy(id)).meta.result_count >=
      +fields.likesAmount
    ) {
      await timer(2000);
      await client.v2.retweet(integration.internalId, id);
      return true;
    }

    return false;
  }

  @PostPlug({
    identifier: 'x-repost-post-users',
    title: 'Add Re-posters',
    description: 'Add accounts to repost your post',
    pickIntegration: ['x'],
    fields: [],
  })
  async repostPostUsers(
    integration: Integration,
    originalIntegration: Integration,
    postId: string,
    information: any
  ) {
    const client = await this.getClient(integration.token, integration);

    const {
      data: { id },
    } = await client.v2.me();

    try {
      await client.v2.retweet(id, postId);
    } catch (err) {
      /** nothing **/
    }
  }

  @Plug({
    identifier: 'x-autoPlugPost',
    title: 'Auto plug post',
    disabled: !!process.env.DISABLE_X_ANALYTICS,
    description:
      'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
    runEveryMilliseconds: 21600000,
    totalRuns: 3,
    fields: [
      {
        name: 'likesAmount',
        type: 'number',
        placeholder: 'Amount of likes',
        description: 'The amount of likes to trigger the repost',
        validation: /^\d+$/,
      },
      {
        name: 'post',
        type: 'richtext',
        placeholder: 'Post to plug',
        description: 'Message content to plug',
        validation: /^[\s\S]{3,}$/g,
      },
    ],
  })
  async autoPlugPost(
    integration: Integration,
    id: string,
    fields: { likesAmount: string; post: string }
  ) {
    const client = await this.getClient(integration.token, integration);

    if (
      (await client.v2.tweetLikedBy(id)).meta.result_count >=
      +fields.likesAmount
    ) {
      await timer(2000);

      await client.v2.tweet({
        text: stripHtmlValidation('normal', fields.post, true),
        reply: { in_reply_to_tweet_id: id },
      });
      return true;
    }

    return false;
  }

  async refreshToken(): Promise<AuthTokenDetails> {
    return {
      id: '',
      name: '',
      accessToken: '',
      refreshToken: '',
      expiresIn: 0,
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl(clientInformation?: ClientInformation) {
    const appKey = clientInformation?.client_id || process.env.X_API_KEY;
    const appSecret =
      clientInformation?.client_secret || process.env.X_API_SECRET;
    if (!appKey || !appSecret) {
      throw new Error(
        'Credenciais do X ausentes: configure em Credenciais de Apps do perfil ou nas env vars X_API_KEY/X_API_SECRET.'
      );
    }
    const client = new TwitterApi({ appKey, appSecret });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink(
        (process.env.X_URL || process.env.FRONTEND_URL) +
          `/integrations/social/x`,
        {
          authAccessType: 'write',
          linkMode: 'authenticate',
          forceLogin: false,
        }
      );
    return {
      url,
      codeVerifier: oauth_token + ':' + oauth_token_secret,
      state: oauth_token,
    };
  }

  async authenticate(
    params: { code: string; codeVerifier: string; refresh?: string },
    clientInformation?: ClientInformation
  ) {
    const { code, codeVerifier } = params;
    const [oauth_token, oauth_token_secret] = codeVerifier.split(':');

    const appKey = clientInformation?.client_id || process.env.X_API_KEY;
    const appSecret =
      clientInformation?.client_secret || process.env.X_API_SECRET;
    if (!appKey || !appSecret) {
      throw new Error('Credenciais do X ausentes ao finalizar OAuth.');
    }

    const startingClient = new TwitterApi({
      appKey,
      appSecret,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { accessToken, client, accessSecret } = await startingClient.login(
      code
    );

    const {
      data: { username, verified, profile_image_url, name, id },
    } = await client.v2.me({
      'user.fields': [
        'username',
        'verified',
        'verified_type',
        'profile_image_url',
        'name',
      ],
    });

    return {
      id: String(id),
      accessToken: accessToken + ':' + accessSecret,
      name,
      refreshToken: '',
      expiresIn: 999999999,
      picture: profile_image_url || '',
      username,
      additionalSettings: [
        {
          title: 'Verified',
          description: 'Is this a verified user? (Premium)',
          type: 'checkbox' as const,
          value: verified,
        },
      ],
    };
  }

  /**
   * Resolve as Consumer Keys (appKey/appSecret) para o fluxo OAuth 1.0a do X,
   * priorizando as credenciais por perfil armazenadas em
   * `integration.customInstanceDetails` (criptografado). Caso nao existam,
   * cai no fallback das env vars X_API_KEY / X_API_SECRET.
   *
   * Jamais retorna string vazia — lanca erro claro se nada for encontrado,
   * para facilitar o diagnostico no worker do Temporal.
   */
  private resolveAppKeys(integration?: Integration): {
    appKey: string;
    appSecret: string;
  } {
    if (integration?.customInstanceDetails) {
      try {
        const decrypted = AuthService.fixedDecryption(
          integration.customInstanceDetails
        );
        const parsed =
          typeof decrypted === 'string' ? JSON.parse(decrypted) : decrypted;
        if (parsed?.client_id && parsed?.client_secret) {
          return {
            appKey: parsed.client_id,
            appSecret: parsed.client_secret,
          };
        }
      } catch (err) {
        console.error(
          '[x.provider] falha ao decodificar customInstanceDetails:',
          err
        );
      }
    }

    const appKey = process.env.X_API_KEY;
    const appSecret = process.env.X_API_SECRET;
    if (!appKey || !appSecret) {
      throw new Error(
        'Credenciais do X ausentes: configure as Consumer Keys do X no perfil (Credenciais de Apps) ou defina X_API_KEY/X_API_SECRET nas env vars.'
      );
    }
    return { appKey, appSecret };
  }

  private async getClient(accessToken: string, integration?: Integration) {
    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const { appKey, appSecret } = this.resolveAppKeys(integration);
    return new TwitterApi({
      appKey,
      appSecret,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });
  }

  private async uploadMedia(
    client: TwitterApi,
    postDetails: PostDetails<any>[]
  ) {
    return (
      await Promise.all(
        postDetails.flatMap((p) =>
          p?.media?.flatMap(async (m) => {
            const mime = (lookup(m.path) || '').toString();
            const isVideo = mime.startsWith('video/') || /\.mp4($|\?)/i.test(m.path);
            const isGif = mime === 'image/gif';

            // Buffer final + media_type coerentes:
            // - video: envia bytes crus como video/mp4
            // - gif animado: preserva GIF (sharp com animated=true)
            // - demais imagens: redimensiona para 1000px mantendo o formato original
            //   (o codigo antigo forcava .gif() mas declarava media_type como PNG/JPEG,
            //   fazendo X rejeitar com erro de media_type)
            let buffer: Buffer;
            let mediaType: string;

            if (isVideo) {
              buffer = Buffer.from(await readOrFetch(m.path));
              mediaType = 'video/mp4';
            } else if (isGif) {
              buffer = await sharp(await readOrFetch(m.path), { animated: true })
                .resize({ width: 1000 })
                .gif()
                .toBuffer();
              mediaType = 'image/gif';
            } else {
              const img = sharp(await readOrFetch(m.path)).resize({ width: 1000 });
              if (mime === 'image/webp') {
                buffer = await img.webp().toBuffer();
                mediaType = 'image/webp';
              } else if (mime === 'image/png') {
                buffer = await img.png().toBuffer();
                mediaType = 'image/png';
              } else {
                // fallback: JPEG (cobre image/jpeg, image/jpg e formatos desconhecidos)
                buffer = await img.jpeg().toBuffer();
                mediaType = 'image/jpeg';
              }
            }

            return {
              id: await this.runInConcurrent(
                // v1.1 /media/upload.json: disponivel em todos os tiers do X
                // (inclusive Free). O endpoint v2 /2/media/upload (usado por
                // client.v2.uploadMedia) requer tier pago/OAuth2 com escopo
                // media.write e falha com "Unknown Error" no tier Free.
                async () =>
                  client.v1.uploadMedia(buffer, {
                    mimeType: mediaType,
                  }),
                true
              ),
              postId: p.id,
            };
          })
        )
      )
    ).reduce((acc, val) => {
      if (!val?.id) {
        return acc;
      }

      acc[val.postId] = acc[val.postId] || [];
      acc[val.postId].push(val.id);

      return acc;
    }, {} as Record<string, string[]>);
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
      community?: string;
      who_can_reply_post:
        | 'everyone'
        | 'following'
        | 'mentionedUsers'
        | 'subscribers'
        | 'verified';
      made_with_ai?: boolean;
      paid_partnership?: boolean;
    }>[],
    integration?: Integration
  ): Promise<PostResponse[]> {
    const client = await this.getClient(accessToken, integration);
    const {
      data: { username },
    } = await this.runInConcurrent(async () =>
      client.v2.me({
        'user.fields': 'username',
      })
    );

    const [firstPost] = postDetails;

    // upload media for the first post
    const uploadAll = await this.uploadMedia(client, [firstPost]);

    const media_ids = (uploadAll[firstPost.id] || []).filter((f) => f);

    const tweetPayload = this.buildTweetPayload({
      text: firstPost.message,
      media_ids,
      settings: firstPost?.settings || {},
    });

    // @ts-ignore
    const { data }: { data: { id: string } } = await this.runInConcurrent(
      // @ts-ignore
      async () => client.v2.tweet(tweetPayload)
    );

    return [
      {
        postId: data.id,
        id: firstPost.id,
        releaseURL: `https://twitter.com/${username}/status/${data.id}`,
        status: 'posted',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<{
      active_thread_finisher: boolean;
      thread_finisher: string;
      made_with_ai?: boolean;
      paid_partnership?: boolean;
    }>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const client = await this.getClient(accessToken, integration);
    const {
      data: { username },
    } = await this.runInConcurrent(async () =>
      client.v2.me({
        'user.fields': 'username',
      })
    );

    const [commentPost] = postDetails;

    // upload media for the comment
    const uploadAll = await this.uploadMedia(client, [commentPost]);

    const media_ids = (uploadAll[commentPost.id] || []).filter((f) => f);

    const replyToId = lastCommentId || postId;

    const tweetPayload = this.buildTweetPayload({
      text: commentPost.message,
      media_ids,
      settings: commentPost?.settings || {},
      replyToId,
    });

    // @ts-ignore
    const { data }: { data: { id: string } } = await this.runInConcurrent(
      // @ts-ignore
      async () => client.v2.tweet(tweetPayload)
    );

    return [
      {
        postId: data.id,
        id: commentPost.id,
        releaseURL: `https://twitter.com/${username}/status/${data.id}`,
        status: 'posted',
      },
    ];
  }

  private loadAllTweets = async (
    client: TwitterApi,
    id: string,
    until: string,
    since: string,
    token = ''
  ): Promise<TweetV2[]> => {
    const tweets = await client.v2.userTimeline(id, {
      'tweet.fields': ['id'],
      'user.fields': [],
      'poll.fields': [],
      'place.fields': [],
      'media.fields': [],
      exclude: ['replies', 'retweets'],
      start_time: since,
      end_time: until,
      max_results: 100,
      ...(token ? { pagination_token: token } : {}),
    });

    // X API v2 omite o campo "data" quando result_count === 0 — sem este guard
    // o spread quebra com "tweets.data.data is not iterable" na primeira consulta
    // a uma conta sem tweets na janela ou na ultima pagina vazia.
    const items = tweets.data.data || [];
    const nextToken = tweets.meta?.next_token;

    return [
      ...items,
      ...(items.length === 100 && nextToken
        ? await this.loadAllTweets(client, id, until, since, nextToken)
        : []),
    ];
  };

  async analytics(
    id: string,
    accessToken: string,
    date: number,
    integration?: Integration
  ): Promise<AnalyticsData[]> {
    if (process.env.DISABLE_X_ANALYTICS) {
      return [];
    }

    const until = dayjs().endOf('day');
    const since = dayjs().subtract(date > 100 ? 100 : date, 'day');

    const client = await this.getClient(accessToken, integration);

    try {
      const tweets = uniqBy(
        await this.loadAllTweets(
          client,
          id,
          until.format('YYYY-MM-DDTHH:mm:ssZ'),
          since.format('YYYY-MM-DDTHH:mm:ssZ')
        ),
        (p) => p.id
      );

      if (tweets.length === 0) {
        return [];
      }

      const data = await client.v2.tweets(
        tweets.map((p) => p.id),
        {
          'tweet.fields': ['public_metrics'],
        }
      );

      const metrics = data.data.reduce(
        (all, current) => {
          all.impression_count =
            (all.impression_count || 0) +
            +current.public_metrics.impression_count;
          all.bookmark_count =
            (all.bookmark_count || 0) + +current.public_metrics.bookmark_count;
          all.like_count =
            (all.like_count || 0) + +current.public_metrics.like_count;
          all.quote_count =
            (all.quote_count || 0) + +current.public_metrics.quote_count;
          all.reply_count =
            (all.reply_count || 0) + +current.public_metrics.reply_count;
          all.retweet_count =
            (all.retweet_count || 0) + +current.public_metrics.retweet_count;

          return all;
        },
        {
          impression_count: 0,
          bookmark_count: 0,
          like_count: 0,
          quote_count: 0,
          reply_count: 0,
          retweet_count: 0,
        }
      );

      return Object.entries(metrics).map(([key, value]) => ({
        label: key.replace('_count', '').replace('_', ' ').toUpperCase(),
        percentageChange: 5,
        data: [
          {
            total: String(0),
            date: since.format('YYYY-MM-DD'),
          },
          {
            total: String(value),
            date: until.format('YYYY-MM-DD'),
          },
        ],
      }));
    } catch (err) {
      console.log(err);
    }
    return [];
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number,
    integration?: Integration
  ): Promise<AnalyticsData[]> {
    if (process.env.DISABLE_X_ANALYTICS) {
      return [];
    }

    const today = dayjs().format('YYYY-MM-DD');

    const client = await this.getClient(accessToken, integration);

    try {
      // Fetch the specific tweet with public metrics
      const tweet = await client.v2.singleTweet(postId, {
        'tweet.fields': ['public_metrics', 'created_at'],
      });

      if (!tweet?.data?.public_metrics) {
        return [];
      }

      const metrics = tweet.data.public_metrics;

      const result: AnalyticsData[] = [];

      if (metrics.impression_count !== undefined) {
        result.push({
          label: 'Impressions',
          percentageChange: 0,
          data: [{ total: String(metrics.impression_count), date: today }],
        });
      }

      if (metrics.like_count !== undefined) {
        result.push({
          label: 'Likes',
          percentageChange: 0,
          data: [{ total: String(metrics.like_count), date: today }],
        });
      }

      if (metrics.retweet_count !== undefined) {
        result.push({
          label: 'Retweets',
          percentageChange: 0,
          data: [{ total: String(metrics.retweet_count), date: today }],
        });
      }

      if (metrics.reply_count !== undefined) {
        result.push({
          label: 'Replies',
          percentageChange: 0,
          data: [{ total: String(metrics.reply_count), date: today }],
        });
      }

      if (metrics.quote_count !== undefined) {
        result.push({
          label: 'Quotes',
          percentageChange: 0,
          data: [{ total: String(metrics.quote_count), date: today }],
        });
      }

      if (metrics.bookmark_count !== undefined) {
        result.push({
          label: 'Bookmarks',
          percentageChange: 0,
          data: [{ total: String(metrics.bookmark_count), date: today }],
        });
      }

      return result;
    } catch (err) {
      console.log('Error fetching X post analytics:', err);
    }

    return [];
  }

  override async mention(
    token: string,
    d: { query: string },
    id: string,
    integration: Integration
  ) {
    const client = await this.getClient(token, integration);

    try {
      const data = await client.v2.userByUsername(d.query, {
        'user.fields': ['username', 'name', 'profile_image_url'],
      });

      if (!data?.data?.username) {
        return [];
      }

      return [
        {
          id: data.data.username,
          image: data.data.profile_image_url,
          label: data.data.name,
        },
      ];
    } catch (err) {
      console.log(err);
    }
    return [];
  }

  mentionFormat(idOrHandle: string, name: string) {
    return `@${idOrHandle}`;
  }
}
