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
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import * as process from 'node:process';
import dayjs from 'dayjs';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { GmbSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/gmb.settings.dto';

const clientAndGmb = () => {
  const client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_GMB_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
    clientSecret:
      process.env.GOOGLE_GMB_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
  });

  const oauth2 = (newClient: OAuth2Client) =>
    google.oauth2({
      version: 'v2',
      auth: newClient,
    });

  return { client, oauth2 };
};

@Rules(
  'Google My Business posts can have text content and optionally one image. Posts can be updates, events, or offers.'
)
export class GmbProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'gmb';
  name = 'Google My Business';
  isBetweenSteps = true;
  scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/business.manage',
  ];
  editor = 'normal' as const;
  dto = GmbSettingsDto;

  maxLength() {
    return 1500;
  }

  override handleErrors(body: string):
    | {
        type: 'refresh-token' | 'bad-body';
        value: string;
      }
    | undefined {
    if (body.includes('UNAUTHENTICATED') || body.includes('invalid_grant')) {
      return {
        type: 'refresh-token',
        value: 'Please re-authenticate your Google My Business account',
      };
    }

    if (body.includes('PERMISSION_DENIED')) {
      return {
        type: 'refresh-token',
        value:
          'Permission denied. Please ensure you have access to this business location.',
      };
    }

    if (body.includes('NOT_FOUND')) {
      return {
        type: 'bad-body',
        value: 'Business location not found. It may have been deleted.',
      };
    }

    if (body.includes('INVALID_ARGUMENT')) {
      return {
        type: 'bad-body',
        value: 'Invalid post content. Please check your post details.',
      };
    }

    if (body.includes('RESOURCE_EXHAUSTED')) {
      return {
        type: 'bad-body',
        value: 'Rate limit exceeded. Please try again later.',
      };
    }

    return undefined;
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { client, oauth2 } = clientAndGmb();
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
      refreshToken: credentials.refresh_token || refresh_token,
      id: data.id!,
      name: data.name!,
      picture: data?.picture || '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(7);
    const { client } = clientAndGmb();
    return {
      url: client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        state,
        redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
        scope: this.scopes.slice(0),
      }),
      codeVerifier: makeId(11),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const { client, oauth2 } = clientAndGmb();
    const { tokens } = await client.getToken(params.code);
    client.setCredentials(tokens);
    const { scopes } = await client.getTokenInfo(tokens.access_token!);
    this.checkScopes(this.scopes, scopes);

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
      picture: data?.picture || '',
      username: '',
    };
  }

  async pages(accessToken: string) {
    // Get all accounts first
    const accountsResponse = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const accountsData = await accountsResponse.json();

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      return [];
    }

    // Get locations for each account
    const allLocations: Array<{
      id: string;
      name: string;
      picture: { data: { url: string } };
      accountId: string;
      locationName: string;
    }> = [];

    for (const account of accountsData.accounts) {
      const accountName = account.name; // format: accounts/{accountId}

      try {
        const locationsResponse = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        const locationsData = await locationsResponse.json();

        if (locationsData.locations) {
          for (const location of locationsData.locations) {
            // Get profile photo if available
            let photoUrl = '';
            try {
              const mediaResponse = await fetch(
                `https://mybusinessbusinessinformation.googleapis.com/v1/${location.name}/media`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                  },
                }
              );
              const mediaData = await mediaResponse.json();
              if (mediaData.mediaItems && mediaData.mediaItems.length > 0) {
                const profilePhoto = mediaData.mediaItems.find(
                  (m: any) =>
                    m.mediaFormat === 'PHOTO' &&
                    m.locationAssociation?.category === 'PROFILE'
                );
                if (profilePhoto?.googleUrl) {
                  photoUrl = profilePhoto.googleUrl;
                } else if (mediaData.mediaItems[0]?.googleUrl) {
                  photoUrl = mediaData.mediaItems[0].googleUrl;
                }
              }
            } catch {
              // Ignore media fetch errors
            }

            allLocations.push({
              id: location.name, // format: locations/{locationId}
              name: location.title || 'Unnamed Location',
              picture: { data: { url: photoUrl } },
              accountId: accountName,
              locationName: location.name,
            });
          }
        }
      } catch (error) {
        // Continue with other accounts if one fails
        console.error(`Failed to fetch locations for account ${accountName}:`, error);
      }
    }

    return allLocations;
  }

  async fetchPageInformation(
    accessToken: string,
    data: { id: string; accountId: string; locationName: string }
  ) {
    // Fetch location details
    const locationResponse = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${data.id}?readMask=name,title,storefrontAddress,metadata`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const locationData = await locationResponse.json();

    // Try to get profile photo
    let photoUrl = '';
    try {
      const mediaResponse = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${data.id}/media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const mediaData = await mediaResponse.json();
      if (mediaData.mediaItems && mediaData.mediaItems.length > 0) {
        const profilePhoto = mediaData.mediaItems.find(
          (m: any) =>
            m.mediaFormat === 'PHOTO' &&
            m.locationAssociation?.category === 'PROFILE'
        );
        if (profilePhoto?.googleUrl) {
          photoUrl = profilePhoto.googleUrl;
        } else if (mediaData.mediaItems[0]?.googleUrl) {
          photoUrl = mediaData.mediaItems[0].googleUrl;
        }
      }
    } catch {
      // Ignore media fetch errors
    }

    return {
      id: data.id,
      name: locationData.title || 'Unnamed Location',
      access_token: accessToken,
      picture: photoUrl,
      username: '',
    };
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<AuthTokenDetails> {
    const pages = await this.pages(accessToken);
    const findPage = pages.find((p) => p.id === requiredId);

    if (!findPage) {
      throw new Error('Location not found');
    }

    const information = await this.fetchPageInformation(accessToken, {
      id: requiredId,
      accountId: findPage.accountId,
      locationName: findPage.locationName,
    });

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      refreshToken: information.access_token,
      expiresIn: dayjs().add(59, 'days').unix() - dayjs().unix(),
      picture: information.picture,
      username: information.username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<GmbSettingsDto>[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const { settings } = firstPost;

    // Build the local post request body
    const postBody: any = {
      languageCode: 'en',
      summary: firstPost.message,
      topicType: settings?.topicType || 'STANDARD',
    };

    // Add call to action if provided
    if (settings?.callToActionType && settings?.callToActionUrl) {
      postBody.callToAction = {
        actionType: settings.callToActionType,
        url: settings.callToActionUrl,
      };
    }

    // Add media if provided
    if (firstPost.media && firstPost.media.length > 0) {
      const mediaItem = firstPost.media[0];
      postBody.media = [
        {
          mediaFormat: mediaItem.type === 'video' ? 'VIDEO' : 'PHOTO',
          sourceUrl: mediaItem.path,
        },
      ];
    }

    // Add event details if it's an event post
    if (settings?.topicType === 'EVENT' && settings?.eventTitle) {
      postBody.event = {
        title: settings.eventTitle,
        schedule: {
          startDate: this.formatDate(settings.eventStartDate),
          endDate: this.formatDate(settings.eventEndDate),
          ...(settings.eventStartTime && {
            startTime: this.formatTime(settings.eventStartTime),
          }),
          ...(settings.eventEndTime && {
            endTime: this.formatTime(settings.eventEndTime),
          }),
        },
      };
    }

    // Add offer details if it's an offer post
    if (settings?.topicType === 'OFFER') {
      postBody.offer = {
        couponCode: settings?.offerCouponCode || undefined,
        redeemOnlineUrl: settings?.offerRedeemUrl || undefined,
        termsConditions: settings?.offerTerms || undefined,
      };
    }

    // Create the local post
    const response = await this.fetch(
      `https://mybusiness.googleapis.com/v4/${id}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      },
      'create local post'
    );

    const postData = await response.json();

    // Extract the post ID and construct the URL
    const postId = postData.name || '';
    const locationId = id.split('/').pop();

    // GMB posts don't have direct URLs, but we can link to the business profile
    const releaseURL = `https://business.google.com/locations/${locationId}`;

    return [
      {
        id: firstPost.id,
        postId: postId,
        releaseURL: releaseURL,
        status: 'success',
      },
    ];
  }

  private formatDate(dateString?: string): any {
    if (!dateString) {
      return {
        year: dayjs().year(),
        month: dayjs().month() + 1,
        day: dayjs().date(),
      };
    }
    const date = dayjs(dateString);
    return {
      year: date.year(),
      month: date.month() + 1,
      day: date.date(),
    };
  }

  private formatTime(timeString?: string): any {
    if (!timeString) {
      return undefined;
    }
    const [hours, minutes] = timeString.split(':').map(Number);
    return {
      hours: hours || 0,
      minutes: minutes || 0,
      seconds: 0,
      nanos: 0,
    };
  }

  async analytics(
    id: string,
    accessToken: string,
    date: number
  ): Promise<AnalyticsData[]> {
    try {
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(date, 'day').format('YYYY-MM-DD');

      // Use the Business Profile Performance API
      const response = await fetch(
        `https://businessprofileperformance.googleapis.com/v1/${id}:getDailyMetricsTimeSeries?dailyMetric=WEBSITE_CLICKS&dailyMetric=CALL_CLICKS&dailyMetric=BUSINESS_DIRECTION_REQUESTS&dailyMetric=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetric=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyRange.startDate.year=${dayjs(startDate).year()}&dailyRange.startDate.month=${dayjs(startDate).month() + 1}&dailyRange.startDate.day=${dayjs(startDate).date()}&dailyRange.endDate.year=${dayjs(endDate).year()}&dailyRange.endDate.month=${dayjs(endDate).month() + 1}&dailyRange.endDate.day=${dayjs(endDate).date()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!data.timeSeries || data.timeSeries.length === 0) {
        return [];
      }

      const metricLabels: { [key: string]: string } = {
        WEBSITE_CLICKS: 'Website Clicks',
        CALL_CLICKS: 'Phone Calls',
        BUSINESS_DIRECTION_REQUESTS: 'Direction Requests',
        BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'Desktop Map Views',
        BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'Mobile Map Views',
      };

      const analytics: AnalyticsData[] = [];

      for (const series of data.timeSeries) {
        const metricName = series.dailyMetric;
        const label = metricLabels[metricName] || metricName;

        const dataPoints =
          series.timeSeries?.datedValues?.map((dv: any) => ({
            total: dv.value || 0,
            date: `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}-${String(dv.date.day).padStart(2, '0')}`,
          })) || [];

        if (dataPoints.length > 0) {
          analytics.push({
            label,
            percentageChange: 0,
            data: dataPoints,
          });
        }
      }

      return analytics;
    } catch (error) {
      console.error('Error fetching GMB analytics:', error);
      return [];
    }
  }
}
