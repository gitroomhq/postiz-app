import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { TwitchDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/twitch.dto';
import { timer } from '@gitroom/helpers/utils/timer';

export class TwitchProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 1;
  identifier = 'twitch';
  name = 'Twitch';
  isBetweenSteps = false;
  editor = 'normal' as const;
  scopes = ['user:write:chat', 'user:read:chat', 'moderator:manage:announcements'];
  dto = TwitchDto;

  maxLength() {
    return 500; // Twitch chat message max length
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const response = await this.fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
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

    const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/twitch`;

    const url =
      `https://id.twitch.tv/oauth2/authorize` +
      `?response_type=code` +
      `&client_id=${process.env.TWITCH_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(this.scopes.join(' '))}` +
      `&state=${state}`;

    return {
      url,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const redirectUri = `${process.env.FRONTEND_URL}/integrations/social/twitch${
      params.refresh ? `?refresh=${params.refresh}` : ''
    }`;

    const tokenResponse = await this.fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.TWITCH_CLIENT_ID!,
        client_secret: process.env.TWITCH_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code: params.code,
      }),
    });

    const { access_token, refresh_token, expires_in } =
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
    const userResponse = await fetch('https://api.twitch.tv/helix/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Client-Id': process.env.TWITCH_CLIENT_ID!,
      },
    });

    const userData = await userResponse.json();
    const user = userData.data?.[0];

    return {
      id: String(user.id),
      name: user.display_name,
      username: user.login,
      picture: user.profile_image_url || '',
    };
  }

  private async sendAnnouncement(
    broadcasterId: string,
    accessToken: string,
    message: string,
    color: string = 'primary'
  ): Promise<{ success: boolean }> {
    await fetch(
      `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${broadcasterId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.substring(0, 500),
          color,
        }),
      }
    );

    // Announcements return 204 No Content on success
    return { success: true };
  }

  private async sendChatMessage(
    broadcasterId: string,
    accessToken: string,
    message: string,
    replyToMessageId?: string
  ): Promise<{ messageId: string; isSent: boolean }> {
    const body: Record<string, string> = {
      broadcaster_id: broadcasterId,
      sender_id: broadcasterId,
      message: message.substring(0, 500),
    };

    if (replyToMessageId) {
      body.reply_parent_message_id = replyToMessageId;
    }

    const response = await this.fetch(
      'https://api.twitch.tv/helix/chat/messages',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    return {
      messageId: data.data?.[0]?.message_id || makeId(10),
      isSent: data.data?.[0]?.is_sent ?? false,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    await timer(2000);
    const [firstPost] = postDetails;
    const messageType = firstPost.settings?.messageType || 'message';
    const announcementColor = firstPost.settings?.announcementColor || 'primary';

    if (messageType === 'announcement') {
      const result = await this.sendAnnouncement(
        id,
        accessToken,
        firstPost.message,
        announcementColor
      );

      return [
        {
          id: firstPost.id,
          postId: makeId(10), // Announcements don't return a message ID
          releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
          status: result.success ? 'posted' : 'error',
        },
      ];
    }

    // Regular chat message
    const result = await this.sendChatMessage(id, accessToken, firstPost.message);

    return [
      {
        id: firstPost.id,
        postId: result.messageId,
        releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
        status: result.isSent ? 'posted' : 'error',
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
    await timer(2000);
    const [commentPost] = postDetails;
    const messageType = commentPost.settings?.messageType || 'message';
    const announcementColor = commentPost.settings?.announcementColor || 'primary';

    if (messageType === 'announcement') {
      const result = await this.sendAnnouncement(
        id,
        accessToken,
        commentPost.message,
        announcementColor
      );

      return [
        {
          id: commentPost.id,
          postId: makeId(10),
          releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
          status: result.success ? 'posted' : 'error',
        },
      ];
    }

    // Regular chat message with reply
    const result = await this.sendChatMessage(
      id,
      accessToken,
      commentPost.message,
      lastCommentId || postId
    );

    return [
      {
        id: commentPost.id,
        postId: result.messageId,
        releaseURL: `https://twitch.tv/${integration.profile || integration.providerIdentifier}`,
        status: result.isSent ? 'posted' : 'error',
      },
    ];
  }
}
