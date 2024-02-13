import { TwitterApi } from 'twitter-api-v2';
import {AuthTokenDetails, PostDetails, PostResponse, SocialProvider} from "@gitroom/nestjs-libraries/integrations/social/social.integrations.interface";

export class XProvider implements SocialProvider {
    identifier = 'x';
    name = 'X';
    async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
        const startingClient = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID!, clientSecret: process.env.TWITTER_CLIENT_SECRET! });
        const { accessToken, refreshToken: newRefreshToken, expiresIn, client } = await startingClient.refreshOAuth2Token(refreshToken);
        const {data: {id, name}} = await client.v2.me();
        return {
            id,
            name,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn
        }
    }

    async generateAuthUrl() {
        const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID!, clientSecret: process.env.TWITTER_CLIENT_SECRET! });
        const {url, codeVerifier, state} = client.generateOAuth2AuthLink(
            process.env.FRONTEND_URL + '/integrations/social/x',
           { scope: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'] });
        return {
            url,
            codeVerifier,
            state
        }
    }

    async authenticate(params: {code: string, codeVerifier: string}) {
        const startingClient = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID!, clientSecret: process.env.TWITTER_CLIENT_SECRET! });
        const {accessToken, refreshToken, expiresIn, client} = await startingClient.loginWithOAuth2({
            code: params.code,
            codeVerifier: params.codeVerifier,
            redirectUri: process.env.FRONTEND_URL + '/integrations/social/x'
        });

        const {data: {id, name}} = await client.v2.me();

        return {
            id,
            accessToken,
            name,
            refreshToken,
            expiresIn
        }
    }

    async schedulePost(accessToken: string, postDetails: PostDetails[]): Promise<PostResponse[]> {
        const client = new TwitterApi(accessToken);
        const ids: string[] = [];
        for (const post of postDetails) {
            const {data}: {data: {id: string}} = await client.v2.tweet({
                text: post.message,
                ...ids.length ? { reply: {in_reply_to_tweet_id: ids[ids.length - 1]} } : {},
            });
            ids.push(data.id);
        }

        return ids.map(p => ({
            postId: p,
            status: 'posted'
        }));
    }
}