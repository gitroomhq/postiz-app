import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { SocialAbstract } from '../social.abstract';
import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from './social.integrations.interface';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { AuthService } from '@gitroom/helpers/auth/auth.service';
import { get } from 'lodash';

export class WebhookProvider extends SocialAbstract implements SocialProvider {
  identifier = 'webhook';
  name = 'Webhook';
  isBetweenSteps = false;
  scopes = [] as string[];
  editor = 'normal' as const;

  maxLength(_additionalSettings?: any) {
    return 100000;
  }

  async customFields() {
    return [
      {
        key: 'url',
        label: 'Webhook URL',
        defaultValue: '',
        validation: `/^https?:\\/\\/.+$/`,
        type: 'text' as const,
      },
      {
        key: 'postIdJsonPath',
        label: 'Post ID JSON Path (optional)',
        defaultValue: '',
        validation: '',
        type: 'text' as const,
      },
    ];
  }

  async refreshToken(_refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body: { url: string; postIdJsonPath?: string } = JSON.parse(
      Buffer.from(params.code, 'base64').toString()
    );

    try {
      const urlObj = new URL(body.url);
      const domain = urlObj.hostname;

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: '',
        id: Buffer.from(body.url).toString('base64'),
        name: `Webhook (${domain})`,
        picture: '',
        username: domain,
      };
    } catch (e) {
      return 'Invalid URL';
    }
  }

  private getIntegrationConfig(integration: Integration): {
    url: string;
    postIdJsonPath?: string;
  } {
    return JSON.parse(
      AuthService.fixedDecryption(integration.customInstanceDetails!)
    );
  }

  private buildPostPayload(
    postDetails: PostDetails[],
    integration: Integration,
    additionalData?: Record<string, any>
  ) {
    return {
      ...additionalData,
      posts: postDetails.map((post) => ({
        id: post.id,
        message: post.message,
        media: post.media?.map((m) => ({
          type: m.type,
          url: m.path,
          alt: m.alt,
        })),
        poll: post.poll,
        settings: post.settings,
      })),
      integration: {
        id: integration.id,
        name: integration.name,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async sendWebhook(
    url: string,
    payload: any,
    postIdJsonPath?: string
  ): Promise<string> {
    const response = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    // Extract post ID if path is configured
    if (postIdJsonPath?.trim()) {
      try {
        const responseData = responseText ? JSON.parse(responseText) : null;
        if (responseData) {
          const extractedId = get(responseData, postIdJsonPath);
          if (extractedId != null) {
            return String(extractedId);
          }
        }
      } catch (e) {
        console.warn(
          'Webhook response is not valid JSON or path extraction failed:',
          {
            responseText,
            path: postIdJsonPath,
            error: e,
          }
        );
      }
    }

    return makeId(10);
  }

  async post(
    _id: string,
    _accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const config = this.getIntegrationConfig(integration);
    const payload = this.buildPostPayload(postDetails, integration);

    try {
      const postId = await this.sendWebhook(
        config.url,
        payload,
        config.postIdJsonPath
      );

      return [
        {
          id: firstPost.id,
          status: 'completed',
          releaseURL: config.url,
          postId,
        },
      ];
    } catch (error: any) {
      console.error('Webhook POST error:', {
        url: config.url,
        error: error?.message || String(error),
        payload,
      });
      throw error;
    }
  }

  async comment(
    _id: string,
    postId: string,
    lastCommentId: string | undefined,
    _accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [firstComment] = postDetails;
    const config = this.getIntegrationConfig(integration);

    // If no JSON path is configured, comments are not supported
    if (!config.postIdJsonPath?.trim()) {
      throw new Error(
        'Comments are not supported without a Post ID JSON Path configured'
      );
    }

    const payload = this.buildPostPayload(postDetails, integration, {
      type: 'comment',
      postId,
      lastCommentId: lastCommentId || null,
    });

    try {
      const commentId = await this.sendWebhook(
        config.url,
        payload,
        config.postIdJsonPath
      );

      return [
        {
          id: firstComment.id,
          status: 'completed',
          releaseURL: config.url,
          postId: commentId,
        },
      ];
    } catch (error: any) {
      console.error('Webhook COMMENT error:', {
        url: config.url,
        error: error?.message || String(error),
        payload,
      });
      throw error;
    }
  }
}
