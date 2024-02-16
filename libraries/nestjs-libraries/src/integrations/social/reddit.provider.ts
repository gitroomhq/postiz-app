import {AuthTokenDetails, PostDetails, PostResponse, SocialProvider} from "@gitroom/nestjs-libraries/integrations/social/social.integrations.interface";
import {makeId} from "@gitroom/nestjs-libraries/services/make.is";

export class RedditProvider implements SocialProvider {
    identifier = 'reddit';
    name = 'Reddit';
    async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
        const {access_token: accessToken, refresh_token: newRefreshToken, expires_in: expiresIn} = await (await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        })).json();

        const {name, id, icon_img} = await (await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })).json();

        return {
            id,
            name,
            accessToken,
            refreshToken: newRefreshToken,
            expiresIn,
            picture: icon_img.split('?')[0]
        }
    }

    async generateAuthUrl() {
        const state = makeId(6);
        const codeVerifier = makeId(30);
        const url = `https://www.reddit.com/api/v1/authorize?client_id=${process.env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/reddit`)}&duration=permanent&scope=${encodeURIComponent('identity submit flair')}`;
        return {
            url,
            codeVerifier,
            state
        }
    }

    async authenticate(params: {code: string, codeVerifier: string}) {
        const {access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn} = await (await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: params.code,
                redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/reddit`
            })
        })).json();

        const {name, id, icon_img} = await (await fetch('https://oauth.reddit.com/api/v1/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })).json();

        return {
            id,
            name,
            accessToken,
            refreshToken,
            expiresIn,
            picture: icon_img.split('?')[0]
        }
    }

    async post(id: string, accessToken: string, postDetails: PostDetails[]): Promise<PostResponse[]> {
        const [post, ...rest] = postDetails;
        const response = await fetch('https://oauth.reddit.com/api/submit', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                title: 'test',
                kind: 'self',
                text: post.message,
                sr: '/r/gitroom'
            })
        });

        console.log(response);
        return [];
    }
}