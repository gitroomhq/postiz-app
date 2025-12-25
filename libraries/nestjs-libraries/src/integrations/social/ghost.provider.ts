import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { GhostDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/ghost.dto';
import slugify from 'slugify';
import { sign } from 'jsonwebtoken';

interface GhostCredentials {
  domain: string;
  apiKey: string;
}

export class GhostProvider extends SocialAbstract implements SocialProvider {
  identifier = 'ghost';
  name = 'Ghost';
  isBetweenSteps = false;
  editor = 'html' as const;
  scopes = [] as string[];
  override maxConcurrentJob = 5;
  dto = GhostDto;

  maxLength() {
    return 100000;
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: '',
      codeVerifier: makeId(10),
      state,
    };
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

  async customFields() {
    return [
      {
        key: 'domain',
        label: 'Ghost Site URL',
        validation: `/^https?:\\/\\/(?:www\\.)?[\\w\\-]+(\\.[\\w\\-]+)+([\\/?#][^\\s]*)?$/`,
        type: 'text' as const,
      },
      {
        key: 'apiKey',
        label: 'Admin API Key',
        validation: `/^[a-f0-9]+:[a-f0-9]+$/`,
        type: 'password' as const,
      },
    ];
  }

  private generateGhostJWT(apiKey: string): string {
    const [id, secret] = apiKey.split(':');
    const secretBytes = Buffer.from(secret, 'hex');

    return sign({}, secretBytes, {
      algorithm: 'HS256',
      keyid: id,
      expiresIn: '5m',
      audience: '/admin/',
    });
  }

  private parseCredentials(accessToken: string): GhostCredentials {
    return JSON.parse(Buffer.from(accessToken, 'base64').toString()) as GhostCredentials;
  }

  private getApiUrl(domain: string): string {
    const cleanDomain = domain.replace(/\/$/, '');
    return `${cleanDomain}/ghost/api/admin`;
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const credentials = JSON.parse(
      Buffer.from(params.code, 'base64').toString()
    ) as GhostCredentials;

    try {
      const token = this.generateGhostJWT(credentials.apiKey);
      const apiUrl = this.getApiUrl(credentials.domain);

      const response = await fetch(`${apiUrl}/users/me/`, {
        headers: {
          Authorization: `Ghost ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Ghost authentication failed:', error);
        return 'Invalid credentials or API key';
      }

      const data = await response.json();
      const user = data.users?.[0];

      if (!user) {
        return 'Could not retrieve user information';
      }

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: params.code,
        id: `${credentials.domain}_${user.id}`,
        name: user.name || user.email,
        picture: user.profile_image || '',
        username: user.slug || user.email,
      };
    } catch (err) {
      console.error('Ghost authentication error:', err);
      return 'Invalid credentials or connection error';
    }
  }

  private async uploadImage(
    apiUrl: string,
    token: string,
    imageUrl: string
  ): Promise<string | null> {
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        console.error('Failed to fetch image:', imageUrl);
        return null;
      }

      const blob = await imageResponse.blob();
      const filename = imageUrl.split('/').pop() || 'image.jpg';

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('purpose', 'image');

      const uploadResponse = await this.fetch(`${apiUrl}/images/upload/`, {
        method: 'POST',
        headers: {
          Authorization: `Ghost ${token}`,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      return uploadData.images?.[0]?.url || null;
    } catch (err) {
      console.error('Ghost image upload error:', err);
      return null;
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails<GhostDto>[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const credentials = this.parseCredentials(accessToken);
    const token = this.generateGhostJWT(credentials.apiKey);
    const apiUrl = this.getApiUrl(credentials.domain);

    const firstPost = postDetails[0];
    const settings = firstPost.settings;

    let featureImageUrl: string | undefined;
    if (settings?.feature_image?.path) {
      const uploadedUrl = await this.uploadImage(
        apiUrl,
        token,
        settings.feature_image.path
      );
      if (uploadedUrl) {
        featureImageUrl = uploadedUrl;
      }
    }

    const postSlug = settings?.slug
      ? slugify(settings.slug, { lower: true, strict: true, trim: true })
      : slugify(settings?.title || 'untitled', {
          lower: true,
          strict: true,
          trim: true,
        });

    const ghostPost: Record<string, any> = {
      title: settings?.title || 'Untitled',
      html: firstPost.message,
      slug: postSlug,
      status: settings?.status || 'published',
    };

    if (featureImageUrl) {
      ghostPost.feature_image = featureImageUrl;
    }

    if (settings?.tags && settings.tags.length > 0) {
      ghostPost.tags = settings.tags.map((tag) => ({ name: tag }));
    }

    const response = await this.fetch(`${apiUrl}/posts/`, {
      method: 'POST',
      headers: {
        Authorization: `Ghost ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ posts: [ghostPost] }),
    });

    const responseData = await response.json();
    const createdPost = responseData.posts?.[0];

    if (!createdPost) {
      throw new Error('Failed to create Ghost post');
    }

    return [
      {
        id: firstPost.id,
        status: 'completed',
        postId: String(createdPost.id),
        releaseURL: createdPost.url,
      },
    ];
  }
}
