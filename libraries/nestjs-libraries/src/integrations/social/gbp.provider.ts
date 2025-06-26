import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { google } from 'googleapis';

function makeId(length: number): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export class GbpProvider implements SocialProvider {
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

  async generateAuthUrl(external?: any): Promise<{ url: string; codeVerifier: string; state: string }> {
    const oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      this.REDIRECT_URI
    );

    const customerId = external?.customerId;
    const state = external?.state || `${makeId(7)}_${customerId || 'no-customer'}`;

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      prompt: 'consent',
      state,
      include_granted_scopes: true,
    });

    return {
      url,
      codeVerifier: makeId(11),
      state,
    };
  }

  async authenticate(params: {
  code: string;
  codeVerifier: string;
  refresh?: string;
  customerId?: string;
  state?: string;
}): Promise<AuthTokenDetails | string> {
  const oauth2Client = new google.auth.OAuth2(
    this.GOOGLE_CLIENT_ID,
    this.GOOGLE_CLIENT_SECRET,
    this.REDIRECT_URI
  );

  try {
    const { tokens } = await oauth2Client.getToken(params.code);
    
    if (!tokens.access_token) {
      return 'Missing access token';
    }

    oauth2Client.setCredentials(tokens);

    // Get account information
    const accountManagement = google.mybusinessaccountmanagement({
      version: 'v1',
      auth: oauth2Client,
    });

    const { data: accountsData } = await accountManagement.accounts.list();
    const account = accountsData.accounts?.[0];

    if (!account || !account.name) {
      return 'No GBP account found for this user';
    }

    // Get basic location information
    const businessInfo = google.mybusinessbusinessinformation({
      version: 'v1',
      auth: oauth2Client,
    });

    let locations = [];
    let profilePicture = '';
    let displayName = account.accountName || 'GBP Account';
    
    try {
      const { data: locationsData } = await businessInfo.accounts.locations.list({
        parent: account.name,
        readMask: 'name,title,profile',
      });
      
      locations = locationsData.locations || [];
      
      // Get profile picture from first location if available
      if (locations.length > 0) {
        const primaryLocation = locations[0];
        displayName = primaryLocation.title || displayName;
        
        // Correct way to access profile photo
        if (primaryLocation.profile) {
          // Try different possible property names for the profile photo
          profilePicture = 
            (primaryLocation.profile as any).profileImageUri || 
            (primaryLocation.profile as any).photoUri || 
            '';
        }
      }
    } catch (e) {
      console.warn('Could not fetch locations, using account info only');
    }

    // Fallback to account name for username
    const username = displayName.toLowerCase().replace(/\s+/g, '_');

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiresIn: tokens.expiry_date
        ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
        : dayjs().add(1, 'hour').unix(),
      id: account.name,
      name: displayName,
      picture: profilePicture,
      username: username,
      additionalSettings: [
        {
          title: 'Location Count',
          description: 'Number of business locations',
          type: 'text',
          value: locations.length.toString(),
        },
      ],
    };
  } catch (err) {
    console.error('GBP Auth Error:', err);
    return 'Failed to authenticate with GBP';
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

    const { data: locationsData } = await businessInfo.accounts.locations.list({
      parent: id,
      pageSize: 1,
    });

    const location = locationsData.locations?.[0];
    if (!location) {
      throw new Error('No GBP location found for this account');
    }

    const message = postDetails[0]?.message || 'Posted via GBP';

    const postBody = {
      languageCode: 'en-US',
      summary: message,
      topicType: 'STANDARD',
    };

    const url = `https://mybusiness.googleapis.com/v4/${location.name}/localPosts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GBP Post Error:', errorText);
      throw new Error(`Failed to create GBP post: ${errorText}`);
    }

    const postRes = await response.json();
    const postId = postRes.name || 'unknown';

    return [
      {
        id: postId,
        postId: postId,
        releaseURL: `https://business.google.com/posts/l/${location.name?.split('/').pop()}`,
        status: 'success',
      },
    ];
  }
}
