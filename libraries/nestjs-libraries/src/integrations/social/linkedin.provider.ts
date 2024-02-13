import {AuthTokenDetails, PostDetails, PostResponse, SocialProvider} from "@gitroom/nestjs-libraries/integrations/social/social.integrations.interface";
import {makeId} from "@gitroom/nestjs-libraries/services/make.is";

export class LinkedinProvider implements SocialProvider {
    identifier = 'linkedin';
    name = 'LinkedIn';
    async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
        const {access_token: accessToken, refresh_token: refreshToken} = await (await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!
            })
        })).json()

        const {id, localizedFirstName, localizedLastName} = await (await fetch('https://api.linkedin.com/v2/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })).json();

        return {
            id,
            accessToken,
            refreshToken,
            name: `${localizedFirstName} ${localizedLastName}`
        }
    }

    async generateAuthUrl() {
        const state = makeId(6);
        const codeVerifier = makeId(30);
        const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/linkedin`)}&state=${state}&scope=${encodeURIComponent('openid profile w_member_social')}`;
        return {
            url,
            codeVerifier,
            state
        }
    }

    async authenticate(params: {code: string, codeVerifier: string}) {
        const body = new URLSearchParams();
        body.append('grant_type', 'authorization_code');
        body.append('code', params.code);
        body.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/linkedin`);
        body.append('client_id', process.env.LINKEDIN_CLIENT_ID!);
        body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET!);

        const {access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, ...data} = await (await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        })).json()

        console.log({accessToken, expiresIn, refreshToken, data});

        const {name, sub: id} = await (await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })).json();

        return {
            id,
            accessToken,
            refreshToken,
            expiresIn,
            name
        }
    }

    async schedulePost(accessToken: string, postDetails: PostDetails[]): Promise<PostResponse[]> {
        return [];
    }
}