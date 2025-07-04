import {
  AuthTokenDetails,
  ClientInformation,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import qs from 'qs';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { CustomersRepository } from '@gitroom/nestjs-libraries/database/prisma/customers/customers.repository';

@Injectable()
export class WebsiteProvider implements SocialProvider {

  private currentCustomerId = '';
  private currentOrgId: string = '';
  private currentCustomerName: string = '';
  private currentPropertyId: string = '';

  constructor(
    private _customersRepository: CustomersRepository
  ) {}

  identifier = 'website';
  name = 'Website';
  toolTip = 'Connect your Google Analytics account to fetch GA4 reports';
  isWeb3 = false;
  oneTimeToken = false;
  isBetweenSteps = false;

  scopes = ['https://www.googleapis.com/auth/analytics.readonly'];

  private GOOGLE_CLIENT_ID = process.env.GOOGLE_WEBSITE_CLIENT_ID!;
  private GOOGLE_CLIENT_SECRET = process.env.GOOGLE_WEBSITE_CLIENT_SECRET!;
  private REDIRECT_URI = `${process.env.FRONTEND_URL}/integrations/social/website`;


  async generateAuthUrl(clientInformation: ClientInformation, customerId: string) {
    this.currentCustomerId = customerId;

    try {
      const customer = await this._customersRepository.getCustomerByPKId(customerId);
      this.currentOrgId = customer?.orgId || '';
      this.currentCustomerName = customer?.name || 'Website User';
    } catch (e) {
      console.error('Error fetching customer details:', e);
      this.currentOrgId = '';
      this.currentCustomerName = 'Website User';
    }

    const state = Buffer.from(
      JSON.stringify({
        customerId,
        timestamp: Date.now(),
      })
    ).toString('base64');

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(this.REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`;

    return {
      url: authUrl,
      codeVerifier: makeId(11),
      state,
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

    try {
      const customerId = this.currentCustomerId;

      if (!customerId) {
        throw new Error('CustomerId is not set on WebsiteProvider');
      }

      // Fetch config for PROPERTY_ID
      const configRes = await axios.get(
        `${process.env.BACKEND_INTERNAL_URL}/social-media-platform-config`,
        {
          params: { customerId },
          headers: {
            cookie: process.env.INTERNEL_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      const configs = configRes.data as any[];

      const websitePlatform = configs.find(
        (c) => c.platformKey === 'website' && c.customerId === customerId
      );

      if (!websitePlatform) {
        throw new Error('Website platform config not found');
      }
      
      const propertyIdConfig = websitePlatform.config.find(
        (c: { key: string }) => c.key === 'GOOGLE_WEBSITE_PROPERTY_ID'
      );

      const propertyId = propertyIdConfig?.value;

      if (!propertyId) {
        throw new Error('GOOGLE_WEBSITE_PROPERTY_ID not found');
      }

      this.currentPropertyId = propertyId;

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        qs.stringify({
          code: params.code,
          client_id: this.GOOGLE_CLIENT_ID,
          client_secret: this.GOOGLE_CLIENT_SECRET,
          redirect_uri: this.REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      
      if (!this.currentCustomerName) {
        const customer = await this._customersRepository.getCustomerByPKId(customerId);
        this.currentCustomerName = customer?.name || 'Website User';
      }


      return {
        accessToken: access_token,
        refreshToken: refresh_token || '',
        expiresIn: expires_in || dayjs().add(1, 'hour').unix(),
        id: propertyId,
        name: this.currentCustomerName, 
        username: this.currentCustomerName,
        additionalSettings: [
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
          }
        ],
      };
    } catch (err: any) {
      console.error('Website OAuth Error:', err.response?.data || err.message);
      return 'Failed to exchange authorization code for token';
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      qs.stringify({
        client_id: this.GOOGLE_CLIENT_ID,
        client_secret: this.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, expires_in } = tokenResponse.data;

    if (!this.currentCustomerName) {
      try {
        const customer = await this._customersRepository.getCustomerByPKId(this.currentCustomerId);
        this.currentCustomerName = customer?.name || 'Website User';
      } catch (e) {
        console.error('Error fetching customer name in refreshToken:', e);
      }
    }

    console.log("Refresh this.currentPropertyId",this.currentPropertyId);
    console.log("Refresh this.currentCustomerName",this.currentCustomerName);


    return {
      accessToken: access_token,
      refreshToken: refreshToken,
      expiresIn: expires_in || dayjs().add(1, 'hour').unix(),
      id: this.currentPropertyId,
      name: this.currentCustomerName,
      picture: '',
      username: this.currentCustomerName,
      additionalSettings: [],
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: any
  ): Promise<PostResponse[]> {
    throw new Error('Posting is not implemented for WebsiteProvider.');
  }
}
