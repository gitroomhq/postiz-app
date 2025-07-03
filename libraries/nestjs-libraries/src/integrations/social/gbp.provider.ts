import {
  AuthTokenDetails,
  ClientInformation,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { google } from 'googleapis';
import { CustomersRepository } from '@gitroom/nestjs-libraries/database/prisma/customers/customers.repository';
import { Injectable } from '@nestjs/common';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

@Injectable()
export class GbpProvider implements SocialProvider {

  private currentCustomerId: string = '';
  private currentOrgId: string = '';
  private currentCustomerName: string = '';

  constructor(
    private _customersRepository: CustomersRepository
  ) { }

  identifier = 'gbp';
  name = 'Google Business Profile';
  toolTip = 'Connect your Google Business Profile account to manage your business listings';
  isWeb3 = false;
  oneTimeToken = false;
  isBetweenSteps = false;

  scopes = ['https://www.googleapis.com/auth/business.manage'];

  private GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
  private GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
  private REDIRECT_URI = `${process.env.FRONTEND_URL}/integrations/social/gbp`;


  async generateAuthUrl(clientInformation: ClientInformation, customerId: string) {

    const oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      this.REDIRECT_URI
    );

    console.log("customerId",customerId);
  
    // Store in class properties
    this.currentCustomerId = customerId;

    try {
      const customer = await this._customersRepository.getCustomerByPKId(customerId);
      this.currentOrgId = customer?.orgId || '';
      this.currentCustomerName = customer?.name || 'GBP User';
    } catch (e) {
      console.error('Error fetching customer details:', e);
      this.currentOrgId = '';
      this.currentCustomerName = 'GBP User';
    }

    const state = `customerId:${customerId},uniqueState:${makeId(6)}`;

    // const encodedState = encodeURIComponent(JSON.stringify(state));
    // const encodedState = 

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent',
      state: encodeURIComponent((state)),
      include_granted_scopes: true,
    });

    return {
      url,
      codeVerifier: makeId(11),
      // state,
      state: encodeURIComponent((state)),
      // state // Return raw state to frontend (not encoded)
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    state: string;
    refresh?: string;
  }): Promise<AuthTokenDetails | string> {
    if (!params.code) {
      return 'Missing authorization code';
    }

    // Verify state (minimal verification)
    // try {
    //   const state = JSON.parse(decodeURIComponent(params.state));
    //   if (!state.uniqueState || !state.timestamp) {
    //     return 'Invalid state format';
    //   }
    //   // Optional: Add timestamp validation (e.g., not older than 10 minutes)
    // } catch (e) {
    //   return 'Invalid state parameter';
    // }

    const oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      this.REDIRECT_URI
    );

    try {
      // Exchange code for tokens
      const tokenResponse = await oauth2Client.getToken(params.code);
      const tokens = {
        access_token: tokenResponse.tokens.access_token!,
        refresh_token: tokenResponse.tokens.refresh_token || '',
        expiry_date: tokenResponse.tokens.expiry_date || Date.now() + 3600 * 1000
      };

      oauth2Client.setCredentials({ access_token: tokens.access_token });

      // Get account info
      const accountManagement = google.mybusinessaccountmanagement({
        version: 'v1',
        auth: oauth2Client,
      });

      const { data: accountsData } = await accountManagement.accounts.list();
      const account = accountsData.accounts?.[0];

      if (!account?.name) {
        return 'No Google Business Profile account found';
      }

      // Get locations using class property
      const locations = await this._getAllLocations(oauth2Client, account.name);

      if (locations.length === 0) {
        return 'No business locations found for this account';
      }

      // Use class property for matching
      const location = this._findMatchingLocation(locations, this.currentCustomerName);

      if (!location) {
        return `No matching business location found for "${this.currentCustomerName}"`;
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: Math.floor((tokens.expiry_date - Date.now()) / 1000),
        id: location.name,
        name: location.title || 'Google Business Profile',
        picture: location.profile?.profileImageUri || location.profile?.photoUri || '',
        username: (location.title || 'gbp').toLowerCase().replace(/\s+/g, '_'),
        additionalSettings: [
          {
            title: 'Business Location',
            value: location.title,
            type: 'text',
            description: 'Google Business Profile location'
          },
          {
            title: 'Customer ID',
            value: this.currentCustomerId,
            type: 'text',
            description: 'Associated customer ID'
          },
          {
            title: 'Organization ID',
            value: this.currentOrgId || '',
            type: 'text',
            description: 'Associated organization ID'
          },
          {
            title: 'Location ID',
            value: location.name?.split('/').pop() || '',
            type: 'text',
            description: 'Google Business Location ID'
          }
        ]
      };
    } catch (err) {
      console.error('GBP Authentication Error:', err);
      return err instanceof Error && err.message.includes('invalid_grant')
        ? 'Invalid authorization code. Please try again.'
        : 'An unexpected error occurred during authentication';
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresIn: credentials.expiry_date
        ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
        : dayjs().add(1, 'hour').unix(),
      id: '',
      name: '',
      picture: '',
      username: '',
      additionalSettings: [],
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const businessInfo = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: oauth2Client,
    });

    // Get location to post to
    const locations = await this._getAllLocations(oauth2Client, id);
    const location = locations[0];

    if (!location) {
      throw new Error('No GBP location found for this account');
    }

    const message = postDetails[0]?.message || 'Posted via GBP';

    const response = await fetch(
      `https://mybusiness.googleapis.com/v4/${location.name}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languageCode: 'en-US',
          summary: message,
          topicType: 'STANDARD',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create GBP post: ${errorText}`);
    }

    const postRes = await response.json();
    const postId = postRes.name || 'unknown';

    return [{
      id: postId,
      postId: postId,
      releaseURL: `https://business.google.com/posts/l/${location.name?.split('/').pop()}`,
      status: 'success',
    }];
  }

  private async _getAllLocations(auth: any, accountName: string) {
    const businessInfo = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: auth,
    });

    let allLocations: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      try {
        const { data }: any = await businessInfo.accounts.locations.list({
          parent: accountName,
          readMask: 'name,title,profile',
          pageSize: 100,
          pageToken: pageToken,
        });

        if (data.locations) {
          allLocations = allLocations.concat(data.locations);
        }

        pageToken = data.nextPageToken || undefined;
      } catch (error) {
        console.error('Error fetching locations:', error);
        break;
      }
    } while (pageToken);

    return allLocations;
  }

  private _findMatchingLocation(locations: any[], customerName: string) {

    if (!customerName) return null

    return locations.find(loc => {
      const cleanCustomerName = customerName.toLowerCase().trim();
      const cleanLocationName = loc.title.toLowerCase().trim();

      if (cleanLocationName === cleanCustomerName) {
        return true;
      }
      if (cleanLocationName.includes(cleanCustomerName)) {
        return true;
      }
      // if (loc.profile?.description?.toLowerCase().includes(cleanCustomerName)) {
      //   return true;
      // }
      return false;
    });
  }
}