import {
  BadBody,
  SocialAbstract,
} from '@gitroom/nestjs-libraries/integrations/social.abstract';
import {
  AuthTokenDetails,
  FetchPageInformationResult,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { Rules } from '@gitroom/nestjs-libraries/chat/rules.description.decorator';
import { makeSecureId } from '@gitroom/nestjs-libraries/services/make.secure.id';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';

const BUFFER_API = 'https://api.buffer.com';
const SEND_TIMEOUT = 30_000;

type BufferChannel = {
  id: string;
  name: string;
  service: string;
  avatar: string;
};

function fail(message: string): never {
  throw new BadBody('buffer', '', '', message);
}

function safeMessage(message: string, secret: string) {
  const cleaned = secret ? message.split(secret).join('').trim() : message.trim();
  return cleaned || 'Buffer could not publish this post.';
}

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'm4v', 'mkv'];

function fileAddress(item: { path: string; url?: string }) {
  const url = typeof item.url === 'string' ? item.url : '';
  const path = typeof item.path === 'string' ? item.path : '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (path.startsWith('/uploads/')) return `${base}${path}`;
  return `${base}/uploads/${path.replace(/^\//, '')}`;
}

function publicHttps(address: string) {
  let parsed: URL;
  try {
    parsed = new URL(address);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.localhost')
  ) {
    return false;
  }
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return false;
  }
  return true;
}

function videoFile(item: { type: string; path: string; url?: string }) {
  const name = `${item.url || ''} ${item.path || ''}`.split('?')[0].toLowerCase();
  return (
    VIDEO_EXTENSIONS.some((ext) => name.endsWith(`.${ext}`)) ||
    item.type === 'video'
  );
}

@Rules(
  'Buffer publishes the scheduled post immediately to the connected Buffer profile. There is no settings panel. Images and videos are sent as the public URLs already stored on the post.'
)
export class BufferProvider extends SocialAbstract implements SocialProvider {
  identifier = 'buffer';
  name = 'Buffer';
  defaultPicture = '/icons/platforms/buffer.png';
  toolTip = 'Publishes the scheduled post through Buffer';
  isBetweenSteps = true;
  scopes = [] as string[];
  editor = 'normal' as const;
  override maxConcurrentJob = 5;

  maxLength() {
    return 100000;
  }

  async customFields() {
    return [
      {
        key: 'apiKey',
        label: 'API key',
        validation: '/^.+$/',
        type: 'password' as const,
      },
    ];
  }

  async refreshToken(): Promise<AuthTokenDetails> {
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

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }): Promise<AuthTokenDetails | string> {
    let body: { apiKey?: unknown };
    try {
      body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    } catch {
      return 'The connection details could not be read.';
    }

    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    if (!apiKey) {
      return 'The API key is missing.';
    }

    try {
      await this.organizations(apiKey);
    } catch (err) {
      return safeMessage(
        err instanceof Error ? err.message : 'The API key was rejected.',
        apiKey
      );
    }

    return {
      id: params.refresh || makeSecureId(16),
      name: 'Buffer',
      accessToken: apiKey,
      refreshToken: '',
      expiresIn: dayjs().add(100, 'year').unix() - dayjs().unix(),
      picture: this.defaultPicture,
      username: '',
    };
  }

  async pages(accessToken: string): Promise<BufferChannel[]> {
    const organizations = await this.organizations(accessToken);
    const seen = new Set<string>();
    const channels: BufferChannel[] = [];

    for (const organizationId of organizations) {
      const data = await this.graphql<{
        channels: Array<{
          id: string;
          name: string;
          service: string;
          avatar?: string | null;
        }>;
      }>(
        accessToken,
        `query Channels($organizationId: OrganizationId!) {
          channels(input: { organizationId: $organizationId }) {
            id
            name
            service
            avatar
          }
        }`,
        { organizationId }
      );

      for (const channel of data.channels || []) {
        if (!channel?.id || seen.has(channel.id)) {
          continue;
        }
        seen.add(channel.id);
        channels.push({
          id: channel.id,
          name: channel.name || 'Buffer',
          service: channel.service || '',
          avatar: channel.avatar || '',
        });
      }
    }

    return channels;
  }

  async fetchPageInformation(
    accessToken: string,
    data: { id: string }
  ): Promise<FetchPageInformationResult> {
    const channel = (await this.pages(accessToken)).find(
      (item) => item.id === data.id
    );
    if (!channel) {
      throw new Error('This Buffer profile could not be found.');
    }

    const picture =
      channel.avatar.startsWith('https://')
        ? channel.avatar
        : this.defaultPicture;

    return {
      id: channel.id,
      name: channel.name,
      access_token: accessToken,
      picture,
      username: channel.service,
    };
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    _integration: Integration
  ): Promise<PostResponse[]> {
    const results: PostResponse[] = [];
    for (const post of postDetails) {
      results.push(await this.deliver(id, accessToken, post));
    }
    return results;
  }

  private async deliver(
    channelId: string,
    accessToken: string,
    post: PostDetails
  ): Promise<PostResponse> {
    const text = typeof post.message === 'string' ? post.message.trim() : '';
    const media = Array.isArray(post.media) ? post.media : [];
    if (!text && media.length === 0) {
      fail('Add text or media before publishing.');
    }

    const assets = media.map((item) => {
      const address = fileAddress(item);
      if (!publicHttps(address)) {
        fail(
          `Buffer cannot download ${address}. The file has to be a public https URL that Buffer's servers can fetch.`
        );
      }
      return videoFile(item)
        ? { video: { url: address } }
        : { image: { url: address } };
    });

    let data: {
      createPost?: {
        message?: string;
        post?: { id?: string; externalLink?: string | null };
      };
    };
    try {
      data = await this.graphql(
        accessToken,
        `mutation CreatePost($input: CreatePostInput!) {
          createPost(input: $input) {
            ... on PostActionSuccess {
              post { id externalLink }
            }
            ... on MutationError {
              message
            }
          }
        }`,
        {
          input: {
            text,
            channelId,
            schedulingType: 'automatic',
            mode: 'shareNow',
            ...(assets.length ? { assets } : {}),
          },
        }
      );
    } catch (err) {
      fail(
        safeMessage(
          err instanceof Error ? err.message : 'Buffer could not publish this post.',
          accessToken
        )
      );
    }

    const published = data.createPost?.post;
    if (!published?.id) {
      fail(
        safeMessage(
          data.createPost?.message || 'Buffer could not publish this post.',
          accessToken
        )
      );
    }

    return {
      id: post.id,
      postId: published.id,
      releaseURL: published.externalLink || '',
      status: 'completed',
    };
  }

  private async organizations(accessToken: string) {
    const data = await this.graphql<{
      account?: { organizations?: Array<{ id: string }> };
    }>(
      accessToken,
      `query Organizations {
        account { organizations { id } }
      }`
    );
    return (data.account?.organizations || [])
      .map((organization) => organization.id)
      .filter(Boolean);
  }

  private async graphql<T>(
    accessToken: string,
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(BUFFER_API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(SEND_TIMEOUT),
      });
    } catch {
      throw new Error('Buffer could not be reached.');
    }

    if (response.status < 200 || response.status > 299) {
      throw new Error('Buffer could not publish this post.');
    }

    let payload: { data?: T; errors?: Array<{ message?: string }> };
    try {
      payload = await response.json();
    } catch {
      throw new Error('Buffer could not publish this post.');
    }

    if (payload.errors?.length) {
      throw new Error(
        payload.errors
          .map((error) => error.message || '')
          .filter(Boolean)
          .join(' ') || 'Buffer could not publish this post.'
      );
    }

    if (!payload.data) {
      throw new Error('Buffer could not publish this post.');
    }

    return payload.data;
  }
}
