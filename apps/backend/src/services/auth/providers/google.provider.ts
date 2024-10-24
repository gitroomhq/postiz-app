import type { ProvidersInterface } from '@gitroom/backend/services/auth/providers.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import type { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import { google } from 'googleapis';

type EnvVar = string | undefined | null;

const coalesceES6 = (...args: EnvVar[]) =>
  args.find((_) => ![null, undefined].includes(_));

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  YOUTUBE_CLIENT_ID = '',
  YOUTUBE_CLIENT_SECRET = '',
} = process.env;

const CLIENT_ID = [GOOGLE_CLIENT_ID, YOUTUBE_CLIENT_ID];
const CLIENT_SECRET = [GOOGLE_CLIENT_SECRET, YOUTUBE_CLIENT_SECRET];

const clientAndYoutube = () => {
  const options = {
    clientId: coalesceES6(...CLIENT_ID),
    clientSecret: coalesceES6(...CLIENT_SECRET),
    redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
  };

  const client = new google.auth.OAuth2(options);

  const youtube = (newClient: OAuth2Client) =>
    google.youtube({
      version: 'v3',
      auth: newClient,
    });

  const youtubeAnalytics = (newClient: OAuth2Client) =>
    google.youtubeAnalytics({
      version: 'v2',
      auth: newClient,
    });

  const oauth2 = (newClient: OAuth2Client) =>
    google.oauth2({
      version: 'v2',
      auth: newClient,
    });

  return { client, youtube, oauth2, youtubeAnalytics };
};

export class GoogleProvider implements ProvidersInterface {
  generateLink() {
    const state = makeId(7);
    const { client } = clientAndYoutube();
    return client.generateAuthUrl({
      access_type: 'online',
      prompt: 'consent',
      state,
      redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
  }

  async getToken(code: string) {
    const { client, oauth2 } = clientAndYoutube();
    const { tokens } = await client.getToken(code);
    return tokens.access_token;
  }

  async getUser(providerToken: string) {
    const { client, oauth2 } = clientAndYoutube();
    client.setCredentials({ access_token: providerToken });
    const user = oauth2(client);
    const { data } = await user.userinfo.get();

    return {
      id: data.id!,
      email: data.email,
    };
  }
}
