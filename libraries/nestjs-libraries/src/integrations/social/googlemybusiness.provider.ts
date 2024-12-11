import {
  AnalyticsData,
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import axios from 'axios';
import dayjs from 'dayjs';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import process from 'node:process';

export class GMBProvider extends SocialAbstract implements SocialProvider {
  identifier = 'gmb';
  name = 'Google My Business';
  isBetweenSteps = true; // Enable intermediate step
  scopes = [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const url = 'https://oauth2.googleapis.com/token';
    const { data } = await axios.post(url, {
      client_id: process.env.GMB_CLIENT_ID,
      client_secret: process.env.GMB_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    });

    const expiryDate = new Date(Date.now() + data.expires_in * 1000);
    const unixTimestamp = Math.floor(expiryDate.getTime() / 1000);

    return {
      accessToken: data.access_token,
      expiresIn: unixTimestamp,
      refreshToken: data.refresh_token || refresh_token,
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(7);
    const params = new URLSearchParams({
      client_id: process.env.GMB_CLIENT_ID!,
      redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      state,
      prompt: 'consent',
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      codeVerifier: makeId(11),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenInfoUrl = 'https://oauth2.googleapis.com/tokeninfo';

    // Exchange authorization code for tokens
    const { data: tokens } = await axios.post(tokenUrl, {
      code: params.code,
      client_id: process.env.GMB_CLIENT_ID,
      client_secret: process.env.GMB_CLIENT_SECRET,
      redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
      grant_type: 'authorization_code',
    });

    // Retrieve token information
    const { data: tokenInfo } = await axios.get(tokenInfoUrl, {
      params: { access_token: tokens.access_token },
    });

    // Ensure required scopes are present
    const tokenScopes = tokenInfo.scope?.split(' ') || [];
    this.checkScopes(this.scopes, tokenScopes);

    // Calculate token expiration
    const expiryDate = new Date(tokens.expires_in * 1000 + Date.now());
    const unixTimestamp = Math.floor(expiryDate.getTime() / 1000);

    // Return authentication details
    return {
      accessToken: tokens.access_token,
      expiresIn: unixTimestamp,
      refreshToken: tokens.refresh_token,
      id: tokenInfo.sub || '', // `sub` contains the user ID in token info
      name: tokenInfo.name || '', // If available, use `name` from token info
      picture: tokenInfo.picture || '', // If available, use `picture` from token info
      username: '', // Google tokens typically don't include a username
    };
  }

  async pages(accessToken: string) {
    // Fetch list of locations (pages) for the user
    const { data } = await (
      await this.fetch(`https://mybusinessaccountmanagement.googleapis.com/v1/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    ).json();

    const accountId = data.accounts?.[0]?.name;
    if (!accountId) {
      throw new Error('No GMB accounts found.');
    }

    const locationsResponse = await axios.get(
      `https://mybusiness.googleapis.com/v4/${accountId}/locations`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const locations = locationsResponse.data.locations || [];

    return locations.map((location: any) => ({
      id: location.name,
      name: location.locationName,
      picture: location.metadata.profilePhotoUrl || '',
    }));
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<AuthTokenDetails> {
    const pages = await this.pages(accessToken);
    const selectedPage = pages.find((p: any) => p.id === requiredId);

    if (!selectedPage) {
      throw new Error('Page not found.');
    }

    // Additional logic to fetch specific page details (if needed)
    return {
      id: selectedPage.id,
      name: selectedPage.name,
      accessToken,
      refreshToken: accessToken,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: selectedPage.picture,
      username: '',
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;

    const postRequest = {
      summary: firstPost.message,
      event: {
        title: 'New Event',
        schedule: {
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(7, 'days').format('YYYY-MM-DD'),
        },
      },
      media: firstPost.media?.map((media) => ({
        mediaFormat: 'PHOTO',
        sourceUrl: media.url,
      })),
    };

    const { data: postResponse } = await axios.post(
      `https://mybusiness.googleapis.com/v4/${id}/localPosts`,
      postRequest,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return [
      {
        id: firstPost.id,
        releaseURL: postResponse.searchUrl,
        postId: postResponse.name,
        status: 'success',
      },
    ];
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    const startDate = dayjs().subtract(date, 'day').format('YYYY-MM-DD');
    const endDate = dayjs().format('YYYY-MM-DD');

    const { data: insights } = await axios.post(
      `https://mybusiness.googleapis.com/v4/accounts/${id}/locations:reportInsights`,
      {
        locationNames: [id],
        basicRequest: {
          metricRequests: [
            { metric: 'VIEWS_SEARCH' },
            { metric: 'VIEWS_MAPS' },
          ],
          timeRange: {
            startTime: `${startDate}T00:00:00Z`,
            endTime: `${endDate}T23:59:59Z`,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const metrics = insights.locationMetrics || [];
    return metrics.map((metric: any) => ({
      label: metric.metric,
      data: metric.values.map((value: any) => ({
        total: value.value,
        date: value.timeRange.endTime,
      })),
    }));
  }
}
