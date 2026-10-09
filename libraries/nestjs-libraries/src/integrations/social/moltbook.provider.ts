import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { MoltbookDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/moltbook.dto';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';

const MOLTBOOK_API_BASE = 'https://www.moltbook.com/api/v1';


/**
 * Redact sensitive headers (Authorization, API keys) from an AxiosError's
 * config so the error object can be safely logged or returned without
 * leaking the plaintext API key.
 *
 * AxiosError carries the request config (including headers) on
 * `error.config`. When axios throws on a non-2xx response, network
 * failure, or DNS error, any code that logs or persists the error
 * object will include `error.config.headers.Authorization` in
 * plaintext. This function strips that before the error propagates.
 */
function redactSensitiveHeaders(error: any): any {
  if (error?.config?.headers) {
    const headers = error.config.headers;
    if (headers.Authorization) {
      headers.Authorization = '[REDACTED]';
    }
    if (headers.authorization) {
      headers.authorization = '[REDACTED]';
    }
    if (headers['X-API-Key']) {
      headers['X-API-Key'] = '[REDACTED]';
    }
  }
  return error;
}

export class MoltbookProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 100; // Moltbook: 100 requests/minute
  identifier = 'moltbook';
  name = 'Moltbook';
  dto = MoltbookDto;
  isBetweenSteps = false;
  scopes = [] as string[];
  isWeb3 = true;
  editor = 'normal' as const;

  /**
   * Wrap an axios promise to redact sensitive headers from any
   * AxiosError that propagates. Prevents API key leakage via
   * error.config.headers.Authorization (issue #2220).
   */
  private async redactAxiosError<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error: any) {
      if (error?.config?.headers) {
        if (error.config.headers.Authorization) {
          error.config.headers.Authorization = '[REDACTED]';
        }
        if (error.config.headers.authorization) {
          error.config.headers.authorization = '[REDACTED]';
        }
      }
      throw error;
    }
  }


  maxLength() {
    return 300;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
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
    const state = makeSecureId(6);
    return {
      url: state,
      codeVerifier: makeSecureId(10),
      state,
    };
  }

  async registerAgent(name: string, description: string) {
    const response = await this.redactAxiosError(this.getSsrfSafeAxios().post(
      `${MOLTBOOK_API_BASE}/agents/register`,
      { name, description },
      { headers: { 'Content-Type': 'application/json' } }
    ));

    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed');
    }

    return response.data.agent;
  }

  async checkAgentStatus(apiKey: string) {
    const response = await this.redactAxiosError(this.getSsrfSafeAxios().get(
      `${MOLTBOOK_API_BASE}/agents/status`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    ));

    return response.data;
  }

  async getAgentProfile(apiKey: string) {
    const response = await this.redactAxiosError(this.getSsrfSafeAxios().get(
      `${MOLTBOOK_API_BASE}/agents/me`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    ));

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get profile');
    }

    return response.data.agent;
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const apiKey = params.code;

    const profile = await this.getAgentProfile(apiKey);

    return {
      id: profile.name || profile.id,
      name: profile.display_name || profile.name,
      accessToken: apiKey,
      refreshToken: '',
      expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
      picture: '',
      username: profile.name,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const results: PostResponse[] = [];

    for (const post of postDetails) {
      const postData: {
        submolt: string;
        title: string;
        content?: string;
        url?: string;
      } = {
        submolt: post.settings?.submolt || 'general',
        title: post.message.slice(0, 100),
        content: post.message,
      };

      const response = await this.redactAxiosError(this.getSsrfSafeAxios().post(
        `${MOLTBOOK_API_BASE}/posts`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      ));

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create post');
      }

      const postId = response.data.post.id;
      results.push({
        id: post.id,
        postId: String(postId),
        releaseURL: `https://www.moltbook.com/post/${postId}`,
        status: 'completed',
      });
    }

    return results;
  }

  async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const results: PostResponse[] = [];

    for (const post of postDetails) {
      const commentData: { content: string; parent_id?: string } = {
        content: post.message,
      };

      if (lastCommentId) {
        commentData.parent_id = lastCommentId;
      }

      const response = await this.redactAxiosError(this.getSsrfSafeAxios().post(
        `${MOLTBOOK_API_BASE}/posts/${postId}/comments`,
        commentData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      ));

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create comment');
      }

      const commentId = response.data.comment.id;
      results.push({
        id: post.id,
        postId: String(commentId),
        releaseURL: `https://www.moltbook.com/post/${postId}`,
        status: 'completed',
      });
    }

    return results;
  }
}
