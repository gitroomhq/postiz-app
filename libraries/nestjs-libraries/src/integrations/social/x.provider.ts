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

export class XProvider extends SocialAbstract implements SocialProvider {
  identifier = 'x';
  name = 'X';
  isBetweenSteps = false;
  scopes = [];

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const startingClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });
    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      client,
    } = await startingClient.refreshOAuth2Token(refreshToken);
    const {
      data: { id, name, profile_image_url },
    } = await client.v2.me();

    const {
      data: { username },
    } = await client.v2.me({
      'user.fields': 'username',
    });

    return {
      id,
      name,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      picture: profile_image_url,
      username,
    };
  }

  async generateAuthUrl() {
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
    });
    const { url, oauth_token, oauth_token_secret } =
      await client.generateAuthLink(
        process.env.FRONTEND_URL + `/integrations/social/x`,
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

  async authenticate(params: { code: string; codeVerifier: string }) {
    const { code, codeVerifier } = params;
    const [oauth_token, oauth_token_secret] = codeVerifier.split(':');

    const startingClient = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: oauth_token,
      accessSecret: oauth_token_secret,
    });

    const { accessToken, client, accessSecret } = await startingClient.login(
      code
    );

    const { id, name, profile_image_url_https } = await client.currentUser(
      true
    );

    const {
      data: { username },
    } = await client.v2.me({
      'user.fields': 'username',
    });

    return {
      id: String(id),
      accessToken: accessToken + ':' + accessSecret,
      name,
      refreshToken: '',
      expiresIn: 999999999,
      picture: profile_image_url_https,
      username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [accessTokenSplit, accessSecretSplit] = accessToken.split(':');
    const client = new TwitterApi({
      appKey: process.env.X_API_KEY!,
      appSecret: process.env.X_API_SECRET!,
      accessToken: accessTokenSplit,
      accessSecret: accessSecretSplit,
    });
    const {
      data: { username },
    } = await client.v2.me({
      'user.fields': 'username',
    });

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

      ids.push({
        postId: data.id,
        id: post.id,
        releaseURL: `https://twitter.com/${username}/status/${data.id}`,
      });
    }

    return ids.map((p) => ({
      ...p,
      status: 'posted',
    }));
  }
}
