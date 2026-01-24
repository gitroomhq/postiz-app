import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { KickDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/kick.dto';
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import { createHash, randomBytes } from 'crypto';

export class KickProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'kick';
  name = 'Kick';
  isBetweenSteps = false;
  editor = 'normal' as const;
  scopes = ['chat:write', 'user:read', 'channel:read'];
  dto = KickDto;

  maxLength() {
    return 500; // Kick chat message max length
  }

  private generatePKCE() {
    const codeVerifier = randomBytes(64).toString('base64url');
    const challenge = Buffer.from(
      createHash('sha256').update(codeVerifier).digest()
    )
      .toString('base64')
      .replace(/=*$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return { codeVerifier, codeChallenge: challenge };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const response = await this.fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.KICK_CLIENT_ID!,
        client_secret: process.env.KICK_SECRET!,
        refresh_token: refreshToken,
      }),
    });

    const { access_token, refresh_token, expires_in } = await response.json();

    // Get user info
    const userInfo = await this.getUserInfo(access_token);

    return {
      refreshToken: refresh_token,
      expiresIn: expires_in,
      accessToken: access_token,
      id: userInfo.id,
      name: userInfo.name,
      picture: userInfo.picture || '',
      username: userInfo.username,
    };
  }

  async generateAuthUrl() {
    const state = makeId(32);
    const { codeVerifier, codeChallenge } = this.generatePKCE();

    const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/kick`;

    const url =
      `https://id.kick.com/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${process.env.KICK_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
      `&state=${state}` +
      `&code_challenge=${codeChallenge}` +
      `&code_challenge_method=S256`;

    return {
      url,
      codeVerifier,
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/kick${
      params.refresh ? `?refresh=${params.refresh}` : ''
    }`;

    const tokenResponse = await this.fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.KICK_CLIENT_ID!,
        client_secret: process.env.KICK_SECRET!,
        redirect_uri: redirectUri,
        code: params.code,
        code_verifier: params.codeVerifier,
      }),
    });

    const { access_token, refresh_token, expires_in, scope } =
      await tokenResponse.json();

    // Get user info
    const userInfo = await this.getUserInfo(access_token);

    return {
      id: userInfo.id,
      name: userInfo.name,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      picture: userInfo.picture || '',
      username: userInfo.username,
    };
  }

  private async getUserInfo(
    accessToken: string
  ): Promise<{ id: string; name: string; username: string; picture?: string }> {
    // Use token introspect to get basic info, then fetch user details
    // Try to get full user info from the API
    const userResponse = await fetch('https://api.kick.com/public/v1/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData = await userResponse.json();
    const user = userData.data?.[0] || userData.data;
    return {
      id: String(user.user_id || user.id),
      name: user.name,
      username: user.name,
      picture: user.profile_picture || '',
    };
  }

  @Tool({
    description: 'Get list of channels/broadcasters the user can post to',
    dataSchema: [],
  })
  async channels(accessToken: string, params: any, id: string) {
    // For Kick, when using a user token, we need to know which broadcaster to post to
    // The user posting as themselves would post to their own channel
    // Try to get channels the user has access to

    try {
      const response = await fetch('https://api.kick.com/public/v1/channels', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const channels = data.data || [];
        return channels.map((channel: any) => ({
          id: String(
            channel.broadcaster_user_id || channel.user_id || channel.id
          ),
          name: channel.slug || channel.username || channel.name,
        }));
      }
    } catch (e) {
      // Fall back to returning the authenticated user's info
    }

    // If no channels found, return the user's own channel
    // The id parameter is the user's own ID from authentication
    return [
      {
        id: id,
        name: 'My Channel',
      },
    ];
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const broadcasterUserId = firstPost.settings.broadcasterUserId;

    // Post chat message to Kick
    // Note: Kick chat doesn't support media attachments directly in messages
    const response = await this.fetch('https://api.kick.com/public/v1/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user',
        content: firstPost.message.substring(0, 500), // Ensure max length
        broadcaster_user_id: parseInt(broadcasterUserId, 10),
      }),
    });

    const data = await response.json();

    return [
      {
        id: firstPost.id,
        postId: data.data?.message_id || data.message_id || makeId(10),
        releaseURL: `https://kick.com/${integration.profile || 'channel'}`,
        status: data.data?.is_sent || data.is_sent ? 'posted' : 'error',
      },
    ];
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [commentPost] = postDetails;
    const broadcasterUserId = commentPost.settings.broadcasterUserId;

    // Kick supports reply_to_message_id for replies
    const response = await this.fetch('https://api.kick.com/public/v1/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'user',
        content: commentPost.message.substring(0, 500),
        broadcaster_user_id: parseInt(broadcasterUserId, 10),
        reply_to_message_id: lastCommentId || postId,
      }),
    });

    const data = await response.json();

    return [
      {
        id: commentPost.id,
        postId: data.data?.message_id || data.message_id || makeId(10),
        releaseURL: `https://kick.com/${integration.profile || 'channel'}`,
        status: data.data?.is_sent || data.is_sent ? 'posted' : 'error',
      },
    ];
  }
}
