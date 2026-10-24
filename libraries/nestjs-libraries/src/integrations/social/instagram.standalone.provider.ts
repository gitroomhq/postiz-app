import {
  AuthTokenDetails,
  AutoReplyConversation,
  AutoReplyConversationMessage,
  AutoReplyEvent,
  AutoReplyMessage,
  AutoReplyPost,
  AutoReplyRecipient,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import dayjs from 'dayjs';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  AutoReplySendError,
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { InstagramProvider } from '@gitroom/nestjs-libraries/integrations/social/instagram.provider';
import { META_GRAPH_API_VERSION } from '@gitroom/nestjs-libraries/integrations/social/facebook.provider';
import { Integration } from '@prisma/client';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';

const instagramProvider = new InstagramProvider();

@Rules(
  "Instagram should have at least one attachment, if it's a story, it can have only one picture"
)
export class InstagramStandaloneProvider
  extends SocialAbstract
  implements SocialProvider
{
  identifier = 'instagram-standalone';
  name = 'Instagram\n(Standalone)';
  isBetweenSteps = false;
  refreshCron = true;
  scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_comments',
    'instagram_business_manage_insights',
    // Auto replies send DMs, opt-in so existing apps without the messaging permission keep working
    ...(process.env.INSTAGRAM_AUTO_REPLIES === 'true'
      ? ['instagram_business_manage_messages']
      : []),
  ];
    override maxConcurrentJob = 200; // Instagram standalone has stricter limits
  dto = InstagramDto;

  editor = 'normal' as const;
  maxLength() {
    return 2200;
  }

  override async checkValidity(
    [firstPost]: Array<ValidityMedia[]>,
    settings: any
  ): Promise<string | true> {
    if (!firstPost?.length) {
      return 'Should have at least one media';
    }
    if (this.assetBoolean(settings?.is_trial_reel)) {
      if ((firstPost?.length ?? 0) > 1) {
        return 'Trial Reels can only have one video';
      }
      const hasVideo = firstPost?.some(
        (f) => (f?.path?.indexOf?.('mp4') ?? -1) > -1
      );
      if (!hasVideo) {
        return 'Trial Reels must be a video';
      }
    }
    return true;
  }

  public override handleErrors(
    body: string,
    status: number
  ):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry' | 'disconnect';
        value: string;
      }
    | undefined {
    return instagramProvider.handleErrors(body, status);
  }

  async refreshToken(refresh_token: string): Promise<AuthTokenDetails> {
    const { access_token } = await (
      await fetch(
        `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refresh_token}`
      )
    ).json();

    const {
      user_id,
      name,
      username,
      profile_picture_url = '',
    } = await (
      await fetch(
        `https://graph.instagram.com/${META_GRAPH_API_VERSION}/me?fields=user_id,username,name,profile_picture_url&access_token=${access_token}`
      )
    ).json();

    return {
      id: user_id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
      picture: profile_picture_url || '',
      username,
    };
  }

  async generateAuthUrl() {
    const state = makeSecureId(6);
    return {
      url:
        `https://www.instagram.com/oauth/authorize?enable_fb_login=0&client_id=${
          process.env.INSTAGRAM_APP_ID
        }&redirect_uri=${encodeURIComponent(
          `${
            process?.env.FRONTEND_URL?.indexOf('https') == -1
              ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
              : `${process?.env.FRONTEND_URL}`
          }/integrations/social/instagram-standalone`
        )}&response_type=code&scope=${encodeURIComponent(
          this.scopes.join(',')
        )}` + `&state=${state}`,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh: string;
  }) {
    const formData = new FormData();
    formData.append('client_id', process.env.INSTAGRAM_APP_ID!);
    formData.append('client_secret', process.env.INSTAGRAM_APP_SECRET!);
    formData.append('grant_type', 'authorization_code');
    formData.append(
      'redirect_uri',
      `${
        process?.env.FRONTEND_URL?.indexOf('https') == -1
          ? `https://redirectmeto.com/${process?.env.FRONTEND_URL}`
          : `${process?.env.FRONTEND_URL}`
      }/integrations/social/instagram-standalone`
    );
    formData.append('code', params.code);

    const getAccessToken = await (
      await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        body: formData,
      })
    ).json();

    const { access_token, expires_in, ...all } = await (
      await fetch(
        'https://graph.instagram.com/access_token' +
          '?grant_type=ig_exchange_token' +
          `&client_id=${process.env.INSTAGRAM_APP_ID}` +
          `&client_secret=${process.env.INSTAGRAM_APP_SECRET}` +
          `&access_token=${getAccessToken.access_token}`
      )
    ).json();

    this.checkScopes(this.scopes, getAccessToken.permissions);

    const { user_id, name, username, profile_picture_url } = await (
      await fetch(
        `https://graph.instagram.com/${META_GRAPH_API_VERSION}/me?fields=user_id,username,name,profile_picture_url&access_token=${access_token}`
      )
    ).json();

    return {
      id: user_id,
      name,
      accessToken: access_token,
      refreshToken: access_token,
      expiresIn: dayjs().add(58, 'days').unix() - dayjs().unix(),
      picture: profile_picture_url,
      username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return instagramProvider.post(
      id,
      accessToken,
      postDetails,
      integration,
      'graph.instagram.com'
    );
  }

  async postPending(
    id: string,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return instagramProvider.postPending(
      id,
      accessToken,
      postDetails,
      integration,
      'graph.instagram.com'
    );
  }

  // the graph domain travels inside pendingData, so these are pure delegations
  override async checkPostStatus(
    accessToken: string,
    pendingData: any,
    integration: Integration
  ) {
    return instagramProvider.checkPostStatus(
      accessToken,
      pendingData,
      integration
    );
  }

  override async finalizePost(
    accessToken: string,
    pendingData: any,
    integration: Integration
  ) {
    return instagramProvider.finalizePost(accessToken, pendingData, integration);
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails<InstagramDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return instagramProvider.comment(
      id,
      postId,
      lastCommentId,
      accessToken,
      postDetails,
      integration,
      'graph.instagram.com'
    );
  }

  async analytics(id: string, accessToken: string, date: number) {
    return instagramProvider.analytics(
      id,
      accessToken,
      date,
      'graph.instagram.com'
    );
  }

  async postAnalytics(
    integrationId: string,
    accessToken: string,
    postId: string,
    date: number
  ) {
    return instagramProvider.postAnalytics(
      integrationId,
      accessToken,
      postId,
      date,
      'graph.instagram.com'
    );
  }

  // Auto replies, ported from OpenReply (MIT, https://github.com/diwenne/openreply)

  // Instagram Login apps sign with the Instagram app secret, Facebook Login apps
  // with the Facebook one, accept either so there is nothing to guess.
  autoReplyVerifyWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>
  ) {
    const signature = headers['x-hub-signature-256'];
    if (!signature || typeof signature !== 'string') {
      return false;
    }

    return [process.env.INSTAGRAM_APP_SECRET, process.env.FACEBOOK_APP_SECRET]
      .filter((secret): secret is string => !!secret)
      .some((secret) => {
        const expected =
          'sha256=' +
          createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
          return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        } catch (err) {
          return false;
        }
      });
  }

  autoReplyParseWebhook(payload: any): AutoReplyEvent[] {
    if (payload?.object !== 'instagram' || !Array.isArray(payload.entry)) {
      return [];
    }

    const events: AutoReplyEvent[] = [];
    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'comments') {
          continue;
        }

        const value = change.value || {};
        const commentId = value.id || value.comment_id;
        const postId = value.media?.id || value.media_id;
        const userId = value.from?.id;
        // Skip the account's own comments, a private reply to yourself is rejected
        if (!entry.id || !commentId || !postId || !userId || userId === entry.id) {
          continue;
        }

        // A comment on a boosted post carries the ad media id, keep the organic one too
        const originalPostId =
          value.media?.original_media_id &&
          value.media.original_media_id !== postId
            ? value.media.original_media_id
            : undefined;

        events.push({
          type: 'comment',
          accountId: entry.id,
          eventId: `comment_${commentId}`,
          commentId,
          text: value.text || '',
          userId,
          userName: value.from?.username,
          postId,
          originalPostId,
        });
      }

      for (const messaging of entry.messaging || []) {
        const userId = messaging.sender?.id;
        const accountId = entry.id || messaging.recipient?.id;
        if (!userId || !accountId || userId === accountId) {
          continue;
        }

        if (messaging.postback?.payload) {
          events.push({
            type: 'postback',
            accountId,
            eventId: `postback_${userId}_${(
              messaging.postback.mid || messaging.postback.payload
            ).replace(/:/g, '_')}`,
            userId,
            payload: messaging.postback.payload,
          });
          continue;
        }

        if (messaging.read) {
          events.push({
            type: 'read',
            accountId,
            eventId: `read_${userId}_${
              messaging.read.watermark || messaging.timestamp || Date.now()
            }`,
            userId,
          });
          continue;
        }

        const message = messaging.message;
        // Echoes include our own auto replies, letting them through would make a reply trigger itself
        if (
          !message ||
          message.is_echo ||
          message.is_deleted ||
          message.is_unsupported
        ) {
          continue;
        }

        const text = message.text?.trim();
        if (!text || !message.mid) {
          continue;
        }

        events.push({
          type: 'message',
          accountId,
          eventId: `message_${Buffer.from(message.mid).toString('base64url')}`,
          text,
          userId,
        });
      }
    }

    return events;
  }

  private async autoReplyFetch(url: string, init: RequestInit = {}) {
    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err: any) {
      // The request may have reached Instagram, so the outcome is unknown
      throw new AutoReplySendError(err?.message || 'Network error', false);
    }

    const data = await response.json().catch(() => ({}));
    if (response.ok && !data?.error) {
      return data;
    }

    const code = Number(data?.error?.code ?? response.status);
    const message = `${data?.error?.message || 'Unknown Instagram error'} [code=${code}]`;
    const retryable = [4, 17, 368].includes(code);
    // Only explicit rejections prove nothing was delivered, code 1 / 2 / 5xx can still deliver
    const rejected = retryable || [10, 100, 190, 200, 551].includes(code);
    const templateRejected =
      code === 100 &&
      /template|button/i.test(message) &&
      !/outside of allowed window|invalid for a private reply|requested user cannot be found/i.test(
        message
      );

    throw new AutoReplySendError(message, rejected, retryable, templateRejected);
  }

  async autoReplySubscribe(accessToken: string, integration: Integration) {
    const subscribe = (fields: string[]) =>
      this.autoReplyFetch(
        `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${
          integration.internalId
        }/subscribed_apps?subscribed_fields=${fields.join(',')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ subscribed_fields: fields }),
        }
      );

    // Button taps and read receipts have their own fields, fall back to the two OpenReply relies on
    try {
      await subscribe(['comments', 'messages', 'messaging_postbacks', 'messaging_seen']);
    } catch (err) {
      await subscribe(['comments', 'messages']);
    }
  }

  async autoReplyRecentPosts(
    accessToken: string,
    integration: Integration
  ): Promise<AutoReplyPost[]> {
    const { data = [] } = await this.autoReplyFetch(
      `https://graph.instagram.com/${META_GRAPH_API_VERSION}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return data.map((media: any) => ({
      id: media.id,
      caption: media.caption || '',
      thumbnail: media.thumbnail_url || media.media_url || '',
      url: media.permalink || '',
      date: media.timestamp || '',
    }));
  }

  async autoReplyPublicReply(
    accessToken: string,
    integration: Integration,
    commentId: string,
    message: string
  ) {
    await this.autoReplyFetch(
      `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${commentId}/replies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message }),
      }
    );
  }

  async autoReplySend(
    accessToken: string,
    integration: Integration,
    recipient: AutoReplyRecipient,
    message: AutoReplyMessage
  ) {
    // A recipient by comment id is Instagram's private reply, one per comment
    const buttons = message.button
      ? [
          {
            type: 'postback',
            title: message.button.title.slice(0, 20),
            payload: message.button.payload,
          },
        ]
      : message.link
      ? [
          {
            type: 'web_url',
            title: message.link.title.slice(0, 20),
            url: message.link.url,
          },
        ]
      : [];

    await this.autoReplyFetch(
      `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${integration.internalId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          recipient:
            'commentId' in recipient
              ? { comment_id: recipient.commentId }
              : { id: recipient.userId },
          message: buttons.length
            ? {
                attachment: {
                  type: 'template',
                  payload: {
                    template_type: 'button',
                    text: message.text.slice(0, 640),
                    buttons,
                  },
                },
              }
            : { text: message.text },
        }),
      }
    );
  }

  // Only answers for users already in a conversation with the account
  async autoReplyFollowStatus(
    accessToken: string,
    integration: Integration,
    userId: string
  ) {
    try {
      const data = await (
        await fetch(
          `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${userId}?fields=is_user_follow_business`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      ).json();
      return typeof data?.is_user_follow_business === 'boolean'
        ? data.is_user_follow_business
        : null;
    } catch (err) {
      return null;
    }
  }

  private isOwnParticipant(integration: Integration, participant: any) {
    return (
      participant?.id === integration.internalId ||
      (!!participant?.username && participant.username === integration.profile)
    );
  }

  async autoReplyConversations(
    accessToken: string,
    integration: Integration
  ): Promise<AutoReplyConversation[]> {
    const load = (fields: string) =>
      this.autoReplyFetch(
        `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${
          integration.internalId
        }/conversations?platform=instagram&limit=50&fields=${encodeURIComponent(
          fields
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

    // One broken conversation can make Meta reject the expanded page with code 1
    const { data = [] } = await load(
      'participants,updated_time,messages.limit(1){message,from,created_time}'
    ).catch((err) =>
      err instanceof AutoReplySendError && /code=1\]/.test(err.message)
        ? load('participants,updated_time')
        : Promise.reject(err)
    );

    return data.map((conversation: any) => {
      const other =
        conversation.participants?.data?.find(
          (p: any) => !this.isOwnParticipant(integration, p)
        ) || {};
      return {
        id: conversation.id,
        userId: other.id || '',
        userName: other.username || '',
        lastMessage: conversation.messages?.data?.[0]?.message || '',
        updatedAt: conversation.updated_time || '',
      };
    });
  }

  async autoReplyConversationMessages(
    accessToken: string,
    integration: Integration,
    conversationId: string
  ): Promise<AutoReplyConversationMessage[]> {
    const data = await this.autoReplyFetch(
      `https://graph.instagram.com/${META_GRAPH_API_VERSION}/${conversationId}?fields=${encodeURIComponent(
        'messages{id,created_time,from,message}'
      )}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return (data.messages?.data || [])
      .map((message: any) => ({
        id: message.id,
        fromMe: this.isOwnParticipant(integration, message.from),
        text: message.message || '',
        createdAt: message.created_time || '',
      }))
      .reverse();
  }
}
