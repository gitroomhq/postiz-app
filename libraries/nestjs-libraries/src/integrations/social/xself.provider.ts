import { TwitterApi } from 'twitter-api-v2';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { lookup } from 'mime-types';
import sharp from 'sharp';
import { readOrFetch } from '@gitroom/helpers/utils/read.or.fetch';
import removeMd from 'remove-markdown';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Plug } from '@gitroom/helpers/decorators/plug.decorator';
import { Integration } from '@prisma/client';
import { timer } from '@gitroom/helpers/utils/timer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { text } from 'stream/consumers';

export class XSelfProvider extends SocialAbstract implements SocialProvider {
  identifier = 'xself';
  name = 'X Self API Token';
  isBetweenSteps = false;
  scopes = [];
  async customFields() {
    return [
      {
        key: 'apiKey',
        label: 'API Key',
        defaultValue: '',
        validation: `/^.{3,}$/`,
        type: 'text' as const,
      },
      {
        key: 'apiSecretKey',
        label: 'API Secret Key',
        validation: `/^.{3,}$/`,
        type: 'text' as const,
      },
      {
        key: 'accessToken',
        label: 'Access Token',
        validation: `/^.{3,}$/`,
        type: 'text' as const,
      },
      {
        key: 'accessTokenSecret',
        label: 'Access Token Secret',
        validation: `/^.{3,}$/`,
        type: 'text' as const,
      },
    ];
  }

  @Plug({
    identifier: 'xself-autoRepostPost',
    title: 'Auto Repost Posts',
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
    const [
      apiKeySplit,
      apiSecretKeySplit,
      accessTokenSplit,
      accessTokenSecretSplit,
    ] = integration.token.split(':');
    const client = new TwitterApi({
      appKey: apiKeySplit,
      appSecret: apiSecretKeySplit,
      accessToken: accessTokenSplit,
      accessSecret: accessTokenSecretSplit,
    });
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

  @Plug({
    identifier: 'xself-autoPlugPost',
    title: 'Auto plug post',
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
    const [
      apiKeySplit,
      apiSecretKeySplit,
      accessTokenSplit,
      accessTokenSecretSplit,
    ] = integration.token.split(':');
    const client = new TwitterApi({
      appKey: apiKeySplit,
      appSecret: apiSecretKeySplit,
      accessToken: accessTokenSplit,
      accessSecret: accessTokenSecretSplit,
    });

    if (
      (await client.v2.tweetLikedBy(id)).meta.result_count >=
      +fields.likesAmount
    ) {
      await timer(2000);

      await client.v2.tweet({
        text: removeMd(fields.post.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢')).replace(
          '𝔫𝔢𝔴𝔩𝔦𝔫𝔢',
          '\n'
        ),
        reply: { in_reply_to_tweet_id: id },
      });
      return true;
    }

    return false;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
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
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());

    const { code, codeVerifier } = params;
    const [oauth_token, oauth_token_secret] = codeVerifier.split(':');

    const startingClient = new TwitterApi({
      appKey: body.apiKey,
      appSecret: body.apiSecretKey,
      accessToken: body.accessToken,
      accessSecret: body.accessTokenSecret,
    });

    const { id, name, profile_image_url_https, screen_name } =
      await startingClient.currentUser(true);

    return {
      id: String(id),
      accessToken:
        body.apiKey +
        ':' +
        body.apiSecretKey +
        ':' +
        body.accessToken +
        ':' +
        body.accessTokenSecret,

      name,
      refreshToken: '',
      expiresIn: 999999999,
      picture: profile_image_url_https,
      username: screen_name,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [
      apiKeySplit,
      apiSecretKeySplit,
      accessTokenSplit,
      accessTokenSecretSplit,
    ] = accessToken.split(':');
    const client = new TwitterApi({
      appKey: apiKeySplit,
      appSecret: apiSecretKeySplit,
      accessToken: accessTokenSplit,
      accessSecret: accessTokenSecretSplit,
    });

    const { name, profile_image_url_https, screen_name } =
      await client.currentUser(true);

    // upload everything before, you don't want it to fail between the posts
    const uploadAll = (
      await Promise.all(
        postDetails.flatMap((p) =>
          p?.media?.flatMap(async (m) => {
            return {
              id: await client.v1.uploadMedia(
                m.url.indexOf('mp4') > -1
                  ? Buffer.from(await readOrFetch(m.url))
                  : await sharp(await readOrFetch(m.url), {
                      animated: lookup(m.url) === 'image/gif',
                    })
                      .resize({
                        width: 1000,
                      })
                      .gif()
                      .toBuffer(),
                {
                  mimeType: lookup(m.url) || '',
                }
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

    const ids: Array<{ postId: string; id: string; releaseURL: string }> = [];
    for (const post of postDetails) {
      const media_ids = (uploadAll[post.id] || []).filter((f) => f);
      // @ts-ignore
      const { data }: { data: { id: string } } = await client.v2.tweet({
        text: removeMd(post.message.replace('\n', '𝔫𝔢𝔴𝔩𝔦𝔫𝔢')).replace(
          '𝔫𝔢𝔴𝔩𝔦𝔫𝔢',
          '\n'
        ),
        ...(media_ids.length ? { media: { media_ids } } : {}),
        ...(ids.length
          ? { reply: { in_reply_to_tweet_id: ids[ids.length - 1].postId } }
          : {}),
      });

      console.log('GGG DATA', data);

      ids.push({
        postId: data.id,
        id: post.id,
        releaseURL: `https://twitter.com/${screen_name}/status/${data.id}`,
      });
    }

    return ids.map((p) => ({
      ...p,
      status: 'posted',
    }));
  }
}
