import { TwitterApi } from 'twitter-api-v2';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

export class XProvider implements SocialProvider {
  identifier = 'x';
  name = 'X';
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
    return {
      id,
      name,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      picture: profile_image_url,
    };
  }

  async generateAuthUrl() {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      process.env.FRONTEND_URL + '/integrations/social/x',
      { scope: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'] }
    );
    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const startingClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });
    const { accessToken, refreshToken, expiresIn, client } =
      await startingClient.loginWithOAuth2({
        code: params.code,
        codeVerifier: params.codeVerifier,
        redirectUri: process.env.FRONTEND_URL + '/integrations/social/x',
      });

    const {
      data: { id, name, profile_image_url },
    } = await client.v2.me({
      'user.fields': 'profile_image_url',
    });

    return {
      id,
      accessToken,
      name,
      refreshToken,
      expiresIn,
      picture: profile_image_url,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
  ): Promise<PostResponse[]> {
    console.log('hello');
    const client = new TwitterApi(accessToken);
    const {data: {username}} = await client.v2.me({
      "user.fields": "username"
    });
    const ids: Array<{postId: string, id: string, releaseURL: string}> = [];
    for (const post of postDetails) {
      const { data }: { data: { id: string } } = await client.v2.tweet({
        text: post.message,
        ...(ids.length
          ? { reply: { in_reply_to_tweet_id: ids[ids.length - 1].postId } }
          : {}),
      });
      ids.push({postId: data.id, id: post.id, releaseURL: `https://twitter.com/${username}/status/${data.id}`});
    }

    return ids.map((p) => ({
      ...p,
      status: 'posted',
    }));
  }
}
