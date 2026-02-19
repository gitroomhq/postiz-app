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

  scopes = [
    'https://www.googleapis.com/auth/business.manage',
    'https://www.googleapis.com/auth/plus.business.manage'
  ];

  config = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    FRONTEND_URL: process.env.FRONTEND_URL || '',
  };

  get REDIRECT_URI() {
    return `${this.config.FRONTEND_URL}/integrations/social/gbp`;
  }

  async generateAuthUrl(clientInformation: ClientInformation, customerId: string) {

    const oauth2Client = new google.auth.OAuth2(
      this.config.GOOGLE_CLIENT_ID,
      this.config.GOOGLE_CLIENT_SECRET,
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
    state?: string;
    refresh?: string;
    customerId?: string;
  }): Promise<AuthTokenDetails | string> {
    if (!params.code) {
      return 'Missing authorization code';
    }

    console.log('🔍 GBP Authenticate - Received customerId:', params.customerId);

    if (params.customerId) {
      this.currentCustomerId = params.customerId;

      try {
        const customer = await this._customersRepository.getCustomerByPKId(params.customerId);
        this.currentOrgId = customer?.orgId || '';
        this.currentCustomerName = customer?.name || 'GBP User';
        console.log('✅ Using customer name for location matching:', this.currentCustomerName);
      } catch (e) {
        console.error('❌ Error fetching customer details:', e);
        this.currentOrgId = '';
        this.currentCustomerName = 'GBP User';
      }
    } else {
      console.warn('⚠️ No customerId provided in authenticate params');
    }

    console.log('⏳ Waiting 10 seconds to avoid rate limiting...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const oauth2Client = new google.auth.OAuth2(
      this.config.GOOGLE_CLIENT_ID,
      this.config.GOOGLE_CLIENT_SECRET,
      this.REDIRECT_URI
    );

    try {
      const tokenResponse = await oauth2Client.getToken(params.code);
      
      if (!tokenResponse.tokens.access_token) {
        return 'Failed to obtain access token';
      }
      
      if (!tokenResponse.tokens.refresh_token) {
        return 'Failed to obtain refresh token. Please ensure you grant offline access.';
      }
      
      const tokens = {
        access_token: tokenResponse.tokens.access_token,
        refresh_token: tokenResponse.tokens.refresh_token,
        expiry_date: tokenResponse.tokens.expiry_date || Date.now() + 3600 * 1000
      };

      oauth2Client.setCredentials({ access_token: tokens.access_token });

      const accountManagement = google.mybusinessaccountmanagement({
        version: 'v1',
        auth: oauth2Client,
      });

      const { data: accountsData } = await accountManagement.accounts.list();
      const account = accountsData.accounts?.[0];

      if (!account?.name) {
        return 'No Google Business Profile account found';
      }

      const locations = await this._getAllLocations(oauth2Client, account.name);

      if (locations.length === 0) {
        return 'No business locations found for this account';
      }

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
    } catch (err: any) {
      console.error('GBP Authentication Error:', err);
      
      if (err.message?.includes('invalid_grant')) {
        return 'Invalid authorization code. Please try again.';
      }
      
      if (err.response?.status === 401) {
        return 'Authentication failed. Please check your Google account permissions.';
      }
      
      return `Authentication error: ${err.message || 'Unknown error'}`;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.GOOGLE_CLIENT_ID,
        this.config.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to obtain new access token');
      }

      console.log('✅ GBP token refreshed successfully');

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresIn: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
        id: '',
        name: '',
        picture: '',
        username: '',
        additionalSettings: [],
      };
    } catch (error: any) {
      console.error('❌ GBP refreshToken failed:', error);
      
      // Don't throw error - return empty tokens to trigger auto-reconnect flow
      // The system will mark as refreshNeeded and user can reconnect
      return {
        accessToken: '',
        refreshToken: refreshToken,
        expiresIn: 0,
        id: '',
        name: '',
        picture: '',
        username: '',
        additionalSettings: [],
      };
    }
  }

  async reConnect(
    refreshToken: string,
    connectionId: string,
    integrationId: string
  ): Promise<AuthTokenDetails> {
    console.log('🔄 GBP reConnect: Refreshing token for integration:', integrationId);
    
    // Validate inputs
    if (!refreshToken) {
      throw new Error('Refresh token is required for reconnection');
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.GOOGLE_CLIENT_ID,
        this.config.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error('Failed to refresh token - no access token received');
      }

      console.log('✅ GBP reConnect: Token refreshed successfully');

      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || refreshToken,
        expiresIn: credentials.expiry_date
          ? Math.floor((credentials.expiry_date - Date.now()) / 1000)
          : 3600,
        id: connectionId || '',
        name: '',
        picture: '',
        username: '',
        additionalSettings: [],
      };
    } catch (error: any) {
      console.error('❌ GBP reConnect failed:', error);
      
      // Handle specific error cases
      if (error.response?.data?.error === 'invalid_grant') {
        throw new Error('Refresh token is invalid or expired. Please reconnect your Google Business Profile account.');
      }
      
      throw new Error(`Failed to refresh token: ${error.message || 'Unknown error'}`);
    }
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

    // The 'id' should be the location name (e.g., "locations/1234567890")
    // If it's just a number, we need to get the account first
    let location;
    
    if (id.startsWith('locations/')) {
      // Direct location ID - use it directly
      location = { name: id };
    } else {
      // We have a location ID or account name, need to fetch locations
      try {
        // First, try to get account information
        const accountManagement = google.mybusinessaccountmanagement({
          version: 'v1',
          auth: oauth2Client,
        });
        
        const { data: accountsData } = await accountManagement.accounts.list();
        const account = accountsData.accounts?.[0];
        
        if (!account?.name) {
          throw new Error('No Google Business Profile account found');
        }
        
        // Get all locations for the account
        const locations = await this._getAllLocations(oauth2Client, account.name);
        
        if (locations.length === 0) {
          throw new Error('No business locations found for this account');
        }
        
        // Find the location by ID or use the first one
        location = locations.find(loc => loc.name?.includes(id)) || locations[0];
      } catch (error) {
        console.error('Error fetching account/locations:', error);
        throw new Error('Failed to fetch business locations');
      }
    }

    if (!location) {
      throw new Error('No GBP location found for this account');
    }

    const message = postDetails[0]?.message || 'Posted via GBP';
    const media = postDetails[0]?.media || [];
    let postId = 'unknown';

    console.log(`✅ Using APPROVED GBP API credentials`);
    console.log(`📍 Attempting to post to location: ${location.name}`);
    console.log(`📝 Post message: ${message}`);
    console.log(`🖼️  Media count: ${media.length}`);
    
    if (media.length > 0) {
      console.log(`🖼️  Media details:`, media.map(m => ({ type: m.type, path: m.path })));
    }

    try {
      // Get account information first
      const accountManagement = google.mybusinessaccountmanagement({
        version: 'v1',
        auth: oauth2Client,
      });
      
      const { data: accountsData } = await accountManagement.accounts.list();
      const account = accountsData.accounts?.[0];
      
      if (!account?.name) {
        throw new Error('No Google Business Profile account found');
      }
      
      const accountId = account.name.split('/').pop();
      const locationId = location.name.split('/').pop();
      
      console.log(`🏢 Account ID: ${accountId}`);
      console.log(`📍 Location ID: ${locationId}`);

      // Prepare post data for Google My Business API v4 (the working API for approved clients)
      const postData: any = {
        languageCode: 'en-US',
        summary: message,
        topicType: 'STANDARD',
      };
      
      // Add media/images to the post if provided
      if (media.length > 0) {
        const mediaContent = [];
        
        for (const mediaItem of media) {
          const mediaUrl = mediaItem.url || mediaItem.path;
          
          // Detect media type from URL/extension
          const isVideo = /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i.test(mediaUrl);
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i.test(mediaUrl);
          
          if (isVideo || mediaItem.type === 'video') {
            console.log(`⚠️  Video not supported by GBP API: ${mediaUrl}`);
            throw new Error('Google Business Profile does not support video uploads via API. Please use images only.');
          } else if (isImage || mediaItem.type === 'image') {
            console.log(`📸 Adding image: ${mediaUrl}`);
            mediaContent.push({
              mediaFormat: 'PHOTO',
              sourceUrl: mediaUrl
            });
          } else {
            console.log(`⚠️  Unknown media type for: ${mediaUrl}, treating as image`);
            mediaContent.push({
              mediaFormat: 'PHOTO',
              sourceUrl: mediaUrl
            });
          }
        }
        
        if (mediaContent.length > 0) {
          postData.media = mediaContent;
          console.log(`🖼️  Added ${mediaContent.length} media items to post`);
        }
      }

      console.log('📤 Post data:', JSON.stringify(postData, null, 2));

      // Use the correct Google My Business API v4 endpoint for approved clients
      const gmbApiUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
      console.log(`🌐 Using GMB API v4 URL: ${gmbApiUrl}`);
      
      const response = await fetch(gmbApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      
      console.log(`📊 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ GBP API Error (${response.status}):`, errorText);
        
        // Try to provide more specific error messages
        if (response.status === 400) {
          throw new Error(`Invalid post data: ${errorText}`);
        } else if (response.status === 401) {
          throw new Error(`Authentication failed. Please re-authenticate your Google Business Profile account.`);
        } else if (response.status === 403) {
          throw new Error(`Access denied. Your account may not have posting permissions for this location.`);
        } else if (response.status === 404) {
          throw new Error(`Location not found. Please verify the business location is properly set up.`);
        } else {
          throw new Error(`GBP API error (${response.status}): ${errorText}`);
        }
      }
      
      const postRes = await response.json();
      postId = postRes.name || postRes.id || 'unknown';
      
      console.log('🎉 GBP Post Success!', JSON.stringify(postRes, null, 2));
      
    } catch (fetchError) {
      console.error('💥 GBP Post Error:', fetchError);
      
      // Provide helpful error message based on the error type
      if (fetchError instanceof Error) {
        if (fetchError.message.includes('Authentication failed')) {
          throw new Error('Authentication failed. Please reconnect your Google Business Profile account.');
        } else if (fetchError.message.includes('Access denied')) {
          throw new Error('Access denied. Please ensure your Google Business Profile account has posting permissions.');
        } else {
          throw new Error(`Failed to create GBP post: ${fetchError.message}`);
        }
      } else {
        throw new Error('Failed to create GBP post: Unknown error occurred');
      }
    }

    return [{
      id: postDetails[0]?.id,
      postId: postId,
      releaseURL: `https://business.google.com/posts/l/${location.name?.split('/').pop()}`,
      status: 'success',
    }];
  }

  private async _getAllLocations(auth: any, accountName: string) {
    console.log('_getAllLocations called with accountName:', accountName);
    
    let allLocations: any[] = [];
    let pageToken: string | undefined = undefined;
    
    // Get access token from auth client
    const accessToken = auth.credentials?.access_token;
    if (!accessToken) {
      throw new Error('No access token available');
    }

    do {
      try {
        console.log(`Fetching locations for parent: ${accountName}, pageToken: ${pageToken}`);
        
        // Build URL parameters
        const params = new URLSearchParams({
          readMask: 'name,title,profile',
          pageSize: '100',
        });
        
        if (pageToken) {
          params.append('pageToken', pageToken);
        }
        
        const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${params.toString()}`;
        console.log('Requesting URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}):`, errorText);
          
          if (response.status === 404) {
            console.log('404 error - Account may not have business locations or API access');
            break;
          }
          
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('API Response data:', JSON.stringify(data, null, 2));

        if (data.locations) {
          console.log(`Found ${data.locations.length} locations`);
          allLocations = allLocations.concat(data.locations);
        } else {
          console.log('No locations found in response');
        }

        pageToken = data.nextPageToken || undefined;
      } catch (error) {
        console.error('Error fetching locations:', error);
        break;
      }
    } while (pageToken);

    console.log(`Total locations found: ${allLocations.length}`);
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

  setConfig(newConfig: Record<string, string>): void {
    this.config = { ...this.config, ...newConfig };
  }
}