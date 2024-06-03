import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library/build/src/auth/oauth2client';
import * as console from 'node:console';
import axios, { all } from 'axios';
import { YoutubeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import * as process from 'node:process';
import dayjs from 'dayjs';

const clientAndYoutube = () => {
  const client = new google.auth.OAuth2({
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
  });

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

export class YoutubeProvider extends SocialAbstract implements SocialProvider {
  identifier = 'youtube';
  name = 'Youtube';
  isBetweenSteps = false;

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { client, oauth2 } = clientAndYoutube();
    client.setCredentials({ refresh_token });
    const { credentials } = await client.refreshAccessToken();
    const user = oauth2(client);
    const expiryDate = new Date(credentials.expiry_date!);
    const unixTimestamp =
      Math.floor(expiryDate.getTime() / 1000) -
      Math.floor(new Date().getTime() / 1000);

    const { data } = await user.userinfo.get();

    return {
      accessToken: credentials.access_token!,
      expiresIn: unixTimestamp!,
      refreshToken: credentials.refresh_token!,
      id: data.id!,
      name: data.name!,
      picture: data.picture!,
      username: '',
    };
  }

  async generateAuthUrl(refresh?: string) {
    const state = makeId(7);
    const { client } = clientAndYoutube();
    return {
      url: client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        state,
        redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtubepartner',
          'https://www.googleapis.com/auth/youtubepartner',
          'https://www.googleapis.com/auth/yt-analytics.readonly',
        ],
      }),
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const { client, oauth2 } = clientAndYoutube();
    const { tokens } = await client.getToken(params.code);
    client.setCredentials(tokens);
    const user = oauth2(client);
    const { data } = await user.userinfo.get();

    const expiryDate = new Date(tokens.expiry_date!);
    const unixTimestamp =
      Math.floor(expiryDate.getTime() / 1000) -
      Math.floor(new Date().getTime() / 1000);

    return {
      accessToken: tokens.access_token!,
      expiresIn: unixTimestamp,
      refreshToken: tokens.refresh_token!,
      id: data.id!,
      name: data.name!,
      picture: data.picture!,
      username: '',
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost, ...comments] = postDetails;

    const { client, youtube } = clientAndYoutube();
    client.setCredentials({ access_token: accessToken });
    const youtubeClient = youtube(client);

    const { settings }: { settings: YoutubeSettingsDto } = firstPost;

    const response = await axios({
      url: firstPost?.media?.[0]?.url,
      method: 'GET',
      responseType: 'stream',
    });

    try {
      const all = await youtubeClient.videos.insert({
        part: ['id', 'snippet', 'status'],
        notifySubscribers: true,
        requestBody: {
          snippet: {
            title: settings.title,
            description: firstPost?.message,
            tags: settings.tags.map((p) => p.label),
            thumbnails: {
              default: {
                url: settings?.thumbnail?.path,
              },
            },
          },
          status: {
            privacyStatus: 'public',
          },
        },
        media: {
          body: response.data,
        },
      });

      console.log(all);
    } catch (err) {
      console.log(err);
    }
    return [];
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const endDate = dayjs().format('YYYY-MM-DD');
    const startDate = dayjs().subtract(date, 'day').format('YYYY-MM-DD');

    const { client, youtubeAnalytics } = clientAndYoutube();
    client.setCredentials({ access_token: accessToken });
    const youtubeClient = youtubeAnalytics(client);
    const { data } = await youtubeClient.reports.query({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics:
        'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,subscribersLost',
      dimensions: 'day',
      sort: 'day',
    });

    const columns = data?.columnHeaders?.map((p) => p.name)!;
    const mappedData = data?.rows?.map((p) => {
      return columns.reduce((acc, curr, index) => {
        acc[curr!] = p[index];
        return acc;
      }, {} as any);
    });

    const acc = [] as any[];
    acc.push({
      label: 'Estimated Minutes Watched',
      data: mappedData?.map((p: any) => ({
        total: p.estimatedMinutesWatched,
        date: p.day,
      })),
    });

    acc.push({
      label: 'Average View Duration',
      average: true,
      data: mappedData?.map((p: any) => ({
        total: p.averageViewDuration,
        date: p.day,
      })),
    });

    acc.push({
      label: 'Average View Percentage',
      average: true,
      data: mappedData?.map((p: any) => ({
        total: p.averageViewPercentage,
        date: p.day,
      })),
    });

    acc.push({
      label: 'Subscribers Gained',
      data: mappedData?.map((p: any) => ({
        total: p.subscribersGained,
        date: p.day,
      })),
    });

    acc.push({
      label: 'Subscribers Lost',
      data: mappedData?.map((p: any) => ({
        total: p.subscribersLost,
        date: p.day,
      })),
    });

    acc.push({
      label: 'Likes',
      data: mappedData?.map((p: any) => ({
        total: p.likes,
        date: p.day,
      })),
    });

    return acc;
  }
}
