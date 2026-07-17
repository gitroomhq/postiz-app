import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import {
  SocialAbstract,
  ValidityMedia,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { TumblrDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tumblr.dto';
import { Integration } from '@prisma/client';
import axios from 'axios';
import { lookup } from 'mime-types';
import { hasExtension } from '@gitroom/helpers/utils/has.extension';

const TUMBLR_API_URL = 'https://api.tumblr.com/v2';
const TUMBLR_USER_AGENT = 'Postiz/1.0 (+https://postiz.com)';
const TUMBLR_TEXT_BLOCK_LIMIT = 4096;
const TUMBLR_DEFAULT_VIDEO_WIDTH = 540;
const TUMBLR_DEFAULT_VIDEO_HEIGHT = 405;

interface TumblrBlog {
  name: string;
  title?: string;
  url?: string;
  primary?: boolean;
  followers?: number;
}

interface TumblrUserInfo {
  response?: {
    user?: {
      name?: string;
      blogs?: TumblrBlog[];
    };
  };
}

interface TumblrTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

interface TumblrCreatePostResponse {
  response?: {
    id?: string | number;
    id_string?: string;
    post_id?: string;
  };
}

type TumblrUploadMedia = {
  type: string;
  identifier: string;
  width: number;
  height: number;
};

type TumblrContentBlock =
  | {
      type: 'text';
      text: string;
      subtype?: 'heading1';
    }
  | {
      type: 'link';
      url: string;
    }
  | {
      type: 'image';
      media: TumblrUploadMedia[];
      alt_text?: string;
    }
  | {
      type: 'video';
      provider: 'tumblr';
      media: TumblrUploadMedia;
    };

export class TumblrProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'tumblr';
  name = 'Tumblr';
  isBetweenSteps = true;
  scopes = ['write', 'offline_access'];
  editor = 'normal' as const;
  dto = TumblrDto;

  maxLength() {
    return 32768;
  }

  override async checkValidity(
    posts: Array<ValidityMedia[]>
  ): Promise<string | true> {
    const [firstPost] = posts ?? [];
    const images =
      firstPost?.filter((item) => !this.isVideoPath(item?.path)) || [];
    const videos =
      firstPost?.filter((item) => this.isVideoPath(item?.path)) || [];

    if (images.length > 30) {
      return 'Tumblr supports up to 30 images in one post.';
    }

    if (videos.length > 1) {
      return 'Tumblr supports one uploaded video in one post.';
    }

    return true;
  }

  override handleErrors(
    body: string,
    status?: number
  ):
    | {
        type: 'refresh-token' | 'bad-body' | 'retry';
        value: string;
      }
    | undefined {
    if (
      status === 401 ||
      body.includes('Unauthorized') ||
      body.includes('invalid_grant') ||
      body.includes('invalid_token')
    ) {
      return {
        type: 'refresh-token',
        value: 'Please re-authenticate your Tumblr account.',
      };
    }

    if (body.includes('daily posting limit') || this.hasErrorCode(body, 8023)) {
      return {
        type: 'bad-body',
        value: 'Tumblr daily posting limit reached.',
      };
    }

    if (this.hasErrorCode(body, 8001)) {
      return {
        type: 'bad-body',
        value: 'Tumblr rejected the post content format.',
      };
    }

    if (this.hasErrorCode(body, 8002)) {
      return {
        type: 'bad-body',
        value: 'Tumblr rejected the reblog parent post information.',
      };
    }

    if (this.hasErrorCode(body, 8004)) {
      return {
        type: 'bad-body',
        value: 'Tumblr daily media upload limit reached.',
      };
    }

    if (this.hasErrorCode(body, 8005)) {
      return {
        type: 'bad-body',
        value: 'Tumblr rejected one of the uploaded media files.',
      };
    }

    if (this.hasErrorCode(body, 8006)) {
      return {
        type: 'retry',
        value: 'Tumblr had a media upload error.',
      };
    }

    if (this.hasErrorCode(body, 8008)) {
      return {
        type: 'bad-body',
        value: 'Tumblr does not allow uploaded videos in reblog content.',
      };
    }

    if (this.hasErrorCode(body, 8010)) {
      return {
        type: 'bad-body',
        value:
          'Tumblr is still transcoding a video upload for this blog. Please try again later.',
      };
    }

    if (this.hasErrorCode(body, 8011)) {
      return {
        type: 'bad-body',
        value: 'Tumblr daily video upload limit reached.',
      };
    }

    if (this.hasErrorCode(body, 8016)) {
      return {
        type: 'bad-body',
        value: 'Tumblr rejected the ask content or layout.',
      };
    }

    if (this.hasErrorCode(body, 8022)) {
      return {
        type: 'bad-body',
        value: 'Tumblr blog queue limit reached.',
      };
    }

    if (this.hasErrorCode(body, 8009)) {
      return {
        type: 'retry',
        value: 'Tumblr had a video upload error.',
      };
    }

    if (status === 429) {
      return {
        type: 'retry',
        value: 'Tumblr API rate limit reached.',
      };
    }

    if (status === 503) {
      return {
        type: 'retry',
        value: 'Tumblr posting via the API is temporarily unavailable.',
      };
    }

    return undefined;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    const token = await this.requestToken(
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.TUMBLR_CLIENT_ID!,
        client_secret: process.env.TUMBLR_CLIENT_SECRET!,
      })
    );

    const userInfo = await this.getUserInfo(token.access_token);
    const user = userInfo.response?.user;
    const primaryBlog = this.getPrimaryBlog(user?.blogs || []);

    return {
      id: user?.name || primaryBlog?.name || '',
      name: user?.name || primaryBlog?.title || primaryBlog?.name || 'Tumblr',
      accessToken: token.access_token,
      refreshToken: token.refresh_token || refreshToken,
      expiresIn: token.expires_in,
      picture: primaryBlog ? this.getAvatarUrl(primaryBlog.name) : '',
      username: user?.name || '',
    };
  }

  async generateAuthUrl() {
    const state = makeId(6);
    const redirectUri = this.redirectUri();
    const params = new URLSearchParams({
      client_id: process.env.TUMBLR_CLIENT_ID!,
      response_type: 'code',
      scope: this.scopes.join(' '),
      state,
      redirect_uri: redirectUri,
    });

    return {
      url: `https://www.tumblr.com/oauth2/authorize?${params.toString()}`,
      codeVerifier: makeId(10),
      state,
    };
  }

  async authenticate(params: { code: string; codeVerifier: string }) {
    const token = await this.requestToken(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        client_id: process.env.TUMBLR_CLIENT_ID!,
        client_secret: process.env.TUMBLR_CLIENT_SECRET!,
        redirect_uri: this.redirectUri(),
      })
    );

    this.checkScopes(this.scopes, token.scope || '');

    const userInfo = await this.getUserInfo(token.access_token);
    const user = userInfo.response?.user;
    const primaryBlog = this.getPrimaryBlog(user?.blogs || []);

    return {
      id: user?.name || primaryBlog?.name || '',
      name: user?.name || primaryBlog?.title || primaryBlog?.name || 'Tumblr',
      accessToken: token.access_token,
      refreshToken: token.refresh_token || '',
      expiresIn: token.expires_in,
      picture: primaryBlog ? this.getAvatarUrl(primaryBlog.name) : '',
      username: user?.name || '',
    };
  }

  async pages(accessToken: string) {
    const userInfo = await this.getUserInfo(accessToken);
    const blogs = userInfo.response?.user?.blogs || [];

    return blogs.map((blog) => ({
      id: blog.name,
      name: blog.title || blog.name,
      username: blog.url || `https://${blog.name}.tumblr.com/`,
      followers: blog.followers || 0,
      primary: !!blog.primary,
      picture: {
        data: {
          url: this.getAvatarUrl(blog.name),
        },
      },
    }));
  }

  async fetchPageInformation(accessToken: string, data: { id: string }) {
    const blogs = await this.pages(accessToken);
    const blog = blogs.find((item) => item.id === data.id);

    if (!blog) {
      throw new Error('Tumblr blog not found');
    }

    return {
      id: blog.id,
      name: blog.name,
      access_token: accessToken,
      picture: blog.picture.data.url,
      username: blog.username,
    };
  }

  async reConnect(
    id: string,
    requiredId: string,
    accessToken: string
  ): Promise<Omit<AuthTokenDetails, 'refreshToken' | 'expiresIn'>> {
    const information = await this.fetchPageInformation(accessToken, {
      id: requiredId,
    });

    return {
      id: information.id,
      name: information.name,
      accessToken: information.access_token,
      picture: information.picture,
      username: information.username,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<TumblrDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const [post] = postDetails;
    const content = await this.createContentBlocks(post);
    const payload = {
      content,
      state: 'published',
      ...(post.settings?.tags ? { tags: post.settings.tags } : {}),
      ...(post.settings?.sourceUrl
        ? { source_url: this.normalizeUrl(post.settings.sourceUrl) }
        : {}),
    };

    const response = post.media?.length
      ? await this.createMultipartPost(id, accessToken, payload, post.media)
      : await this.createJsonPost(id, accessToken, payload);

    const postId = String(
      response.response?.id_string ||
        response.response?.post_id ||
        response.response?.id ||
        ''
    );
    const blogUrl = this.normalizeBlogUrl(
      integration.profile || `https://www.tumblr.com/${id}`
    );

    return [
      {
        id: post.id,
        status: 'completed',
        postId,
        releaseURL: `${blogUrl}/post/${postId}`,
      },
    ];
  }

  private redirectUri() {
    return `${process.env.FRONTEND_URL}/integrations/social/tumblr`;
  }

  private getAvatarUrl(blogName: string) {
    return `${TUMBLR_API_URL}/blog/${encodeURIComponent(
      `${blogName}.tumblr.com`
    )}/avatar/128`;
  }

  private normalizeBlogUrl(url: string) {
    return this.normalizeUrl(url).replace(/\/$/, '');
  }

  private normalizeUrl(url: string) {
    return url.startsWith('http') ? url : `https://${url}`;
  }

  private getMediaUrl(path: string) {
    return path?.indexOf('http') === -1
      ? `${process.env.FRONTEND_URL}/${path}`
      : path;
  }

  private getMimeType(path: string) {
    return lookup(path.split('?')[0]) || 'application/octet-stream';
  }

  private isVideoPath(path?: string | null) {
    return hasExtension(path, 'mp4');
  }

  private async getVideoDimensions(
    media: NonNullable<PostDetails['media']>[number]
  ) {
    if (!media.thumbnail) {
      return {
        width: TUMBLR_DEFAULT_VIDEO_WIDTH,
        height: TUMBLR_DEFAULT_VIDEO_HEIGHT,
      };
    }

    try {
      return await this.getImageDimensions(media.thumbnail);
    } catch {
      return {
        width: TUMBLR_DEFAULT_VIDEO_WIDTH,
        height: TUMBLR_DEFAULT_VIDEO_HEIGHT,
      };
    }
  }

  private getPrimaryBlog(blogs: TumblrBlog[]) {
    return blogs.find((blog) => blog.primary) || blogs[0];
  }

  private async requestToken(body: URLSearchParams) {
    return (await (
      await this.fetch(`${TUMBLR_API_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': TUMBLR_USER_AGENT,
        },
        body,
      })
    ).json()) as TumblrTokenResponse;
  }

  private async getUserInfo(accessToken: string) {
    return (await (
      await this.fetch(`${TUMBLR_API_URL}/user/info`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': TUMBLR_USER_AGENT,
        },
      })
    ).json()) as TumblrUserInfo;
  }

  private async createJsonPost(
    blogName: string,
    accessToken: string,
    payload: { content: TumblrContentBlock[]; [key: string]: any }
  ) {
    return (await (
      await this.fetch(
        `${TUMBLR_API_URL}/blog/${encodeURIComponent(blogName)}/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': TUMBLR_USER_AGENT,
          },
          body: JSON.stringify(payload),
        }
      )
    ).json()) as TumblrCreatePostResponse;
  }

  private async createMultipartPost(
    blogName: string,
    accessToken: string,
    payload: { content: TumblrContentBlock[]; [key: string]: any },
    media: NonNullable<PostDetails['media']>
  ) {
    const formData = new FormData();
    formData.append(
      'json',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );

    for (const [index, item] of media.entries()) {
      const mimeType = this.getMimeType(item.path);
      const { data } = await axios.get(this.getMediaUrl(item.path), {
        responseType: 'arraybuffer',
      });
      formData.append(
        `media-${index}`,
        new Blob([Buffer.from(data)], { type: mimeType }),
        item.path.split('/').pop() || `media-${index}`
      );
    }

    return (await (
      await this.fetch(
        `${TUMBLR_API_URL}/blog/${encodeURIComponent(blogName)}/posts`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': TUMBLR_USER_AGENT,
          },
          body: formData,
        }
      )
    ).json()) as TumblrCreatePostResponse;
  }

  private async createContentBlocks(post: PostDetails<TumblrDto>) {
    const content: TumblrContentBlock[] = [];

    if (post.settings?.title) {
      content.push({
        type: 'text',
        subtype: 'heading1',
        text: post.settings.title,
      });
    }

    content.push(...this.textBlocks(post.message || ''));

    if (post.settings?.link) {
      content.push({
        type: 'link',
        url: this.normalizeUrl(post.settings.link),
      });
    }

    for (const [index, item] of (post.media || []).entries()) {
      const identifier = `media-${index}`;
      const media = {
        type: this.getMimeType(item.path),
        identifier,
      };

      if (this.isVideoPath(item.path)) {
        const details = await this.getVideoDimensions(item);
        content.push({
          type: 'video',
          provider: 'tumblr',
          media: {
            ...media,
            width: details.width,
            height: details.height,
          },
        });
        continue;
      }

      const details = await this.getImageDimensions(item.path);
      content.push({
        type: 'image',
        media: [
          {
            ...media,
            width: details.width,
            height: details.height,
          },
        ],
        ...(item.alt ? { alt_text: item.alt } : {}),
      });
    }

    if (!content.length) {
      content.push({
        type: 'text',
        text: '',
      });
    }

    return content;
  }

  private textBlocks(message: string) {
    return message
      .split(/\n{2,}/g)
      .flatMap((part) => this.chunkText(part.trim()))
      .filter(Boolean)
      .map((text) => ({
        type: 'text' as const,
        text,
      }));
  }

  private chunkText(text: string) {
    const codePoints = Array.from(text);
    const chunks: string[] = [];
    for (let i = 0; i < codePoints.length; i += TUMBLR_TEXT_BLOCK_LIMIT) {
      chunks.push(codePoints.slice(i, i + TUMBLR_TEXT_BLOCK_LIMIT).join(''));
    }
    return chunks;
  }

  private hasErrorCode(body: string, code: number) {
    return new RegExp(`(?:\\b|\\.)${code}\\b`).test(body);
  }
}
