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
import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';
import GhostAdminAPI from '@tryghost/admin-api';

interface GhostCredentials {
  domain: string;
  adminApiKey: string;
  contentApiKey?: string;
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
      url: state,
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
        key: 'adminApiKey',
        label: 'Admin API Key',
        validation: `/^[a-f0-9]{24,26}:[a-f0-9]{64}$/`,
        type: 'password' as const,
        helpText: 'Find this in Ghost Admin > Settings > Integrations > Add custom integration',
      },
      {
        key: 'contentApiKey',
        label: 'Content API Key (optional)',
        validation: `/^[a-f0-9]{26}$/`,
        type: 'password' as const,
        helpText: 'Optional: For reading published content via Content API',
      },
    ];
  }

  private parseCredentials(accessToken: string): GhostCredentials {
    return JSON.parse(Buffer.from(accessToken, 'base64').toString()) as GhostCredentials;
  }

  private createAdminAPI(credentials: GhostCredentials): GhostAdminAPI {
    const url = credentials.domain.replace(/\/$/, '');
    return new GhostAdminAPI({
      url,
      key: credentials.adminApiKey,
      version: 'v6.0',
    });
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const credentials = this.parseCredentials(params.code);

    try {
      const api = this.createAdminAPI(credentials);
      
      // Verify credentials by fetching site info
      const site = await api.site.read();

      if (!site) {
        return 'Could not retrieve site information';
      }

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: params.code,
        id: `ghost_${(site.title || 'site').toLowerCase().replace(/\s+/g, '_').substring(0, 20)}`,
        name: site.title || 'Ghost Site',
        picture: site.logo || site.icon || '',
        username: new URL(credentials.domain).hostname,
      };
    } catch (err: any) {
      console.error('Ghost authentication error:', err?.message || err);
      return `Invalid credentials: ${err?.message || 'connection error'}`;
    }
  }

  @Tool({ description: 'Get Ghost tags', dataSchema: [] })
  async tags(token: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const credentials = this.parseCredentials(token);
      const api = this.createAdminAPI(credentials);

      const tags = await api.tags.browse({ limit: 'all' });

      return (tags || []).map((tag: any) => ({
        value: tag.name || tag.slug,
        label: tag.name,
      }));
    } catch (err) {
      console.error('Ghost tags fetch error:', err);
      return [];
    }
  }

  @Tool({ description: 'Get Ghost authors', dataSchema: [] })
  async authors(token: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const credentials = this.parseCredentials(token);
      const api = this.createAdminAPI(credentials);

      const users = await api.users.browse({ limit: 'all' });

      return (users || []).map((user: any) => ({
        value: user.id,
        label: user.name || user.slug,
      }));
    } catch (err) {
      console.error('Ghost authors fetch error:', err);
      return [];
    }
  }

  @Tool({ description: 'Get Ghost tiers (for paid content)', dataSchema: [] })
  async tiers(token: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const credentials = this.parseCredentials(token);
      const api = this.createAdminAPI(credentials);

      const tiers = await api.tiers.browse();

      return (tiers || []).map((tier: any) => ({
        value: tier.id,
        label: tier.name,
      }));
    } catch (err) {
      console.error('Ghost tiers fetch error:', err);
      return [];
    }
  }

  @Tool({ description: 'Get Ghost newsletters', dataSchema: [] })
  async newsletters(token: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const credentials = this.parseCredentials(token);
      const api = this.createAdminAPI(credentials);

      const newsletters = await api.newsletters.browse();

      return (newsletters || []).map((nl: any) => ({
        value: nl.id,
        label: nl.name,
      }));
    } catch (err) {
      console.error('Ghost newsletters fetch error:', err);
      return [];
    }
  }

  private async uploadImage(
    api: GhostAdminAPI,
    imageUrl: string
  ): Promise<string | null> {
    try {
      // Fetch image from URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error('Failed to fetch image:', imageUrl);
        return null;
      }

      const blob = await response.blob();
      const buffer = Buffer.from(await blob.arrayBuffer());
      const filename = imageUrl.split('/').pop() || 'image.jpg';

      // Upload via Ghost Admin API
      const result = await api.images.upload({
        file: buffer,
        filename,
        purpose: 'image',
      });

      return result?.url || null;
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
    const api = this.createAdminAPI(credentials);

    const firstPost = postDetails[0];
    const settings = firstPost.settings;

    // Handle feature image upload if provided
    let featureImageUrl: string | undefined;
    if (settings?.feature_image?.path) {
      const uploadedUrl = await this.uploadImage(api, settings.feature_image.path);
      if (uploadedUrl) {
        featureImageUrl = uploadedUrl;
      }
    }

    // Extract title from first line of message if not provided in settings
    const messageLines = firstPost.message.split('\n').filter((l) => l.trim());
    const extractedTitle =
      messageLines[0]?.replace(/<[^>]*>/g, '').trim() || 'Untitled';
    const postTitle = settings?.title || extractedTitle;

    // Generate slug
    const postSlug = settings?.slug
      ? slugify(settings.slug, { lower: true, strict: true, trim: true })
      : slugify(postTitle, {
          lower: true,
          strict: true,
          trim: true,
        });

    // Build post data using Ghost SDK format
    const postData: any = {
      title: postTitle,
      html: firstPost.message,
      slug: postSlug,
      status: settings?.status || 'published',
    };

    // Feature image
    if (featureImageUrl) {
      postData.feature_image = featureImageUrl;
    }

    // Feature image metadata
    if (settings?.feature_image_caption) {
      postData.feature_image_caption = settings.feature_image_caption;
    }
    if (settings?.feature_image_alt) {
      postData.feature_image_alt = settings.feature_image_alt;
    }

    // Custom excerpt
    if (settings?.custom_excerpt) {
      postData.custom_excerpt = settings.custom_excerpt;
    }

    // Visibility (public, members, paid)
    if (settings?.visibility) {
      postData.visibility = settings.visibility;
    }

    // SEO/Meta fields
    if (settings?.meta_title) {
      postData.meta_title = settings.meta_title;
    }
    if (settings?.meta_description) {
      postData.meta_description = settings.meta_description;
    }

    // Open Graph
    if (settings?.og_title) {
      postData.og_title = settings.og_title;
    }
    if (settings?.og_description) {
      postData.og_description = settings.og_description;
    }
    if (settings?.og_image) {
      postData.og_image = settings.og_image;
    }

    // Twitter
    if (settings?.twitter_title) {
      postData.twitter_title = settings.twitter_title;
    }
    if (settings?.twitter_description) {
      postData.twitter_description = settings.twitter_description;
    }
    if (settings?.twitter_image) {
      postData.twitter_image = settings.twitter_image;
    }

    // Canonical URL
    if (settings?.canonical_url) {
      postData.canonical_url = settings.canonical_url;
    }

    // Email settings
    if (settings?.email_subject) {
      postData.email_subject = settings.email_subject;
    }

    // Scheduled publishing
    if (settings?.published_at) {
      postData.published_at = settings.published_at;
    }

    // Tags (can be array of names or objects with name property)
    if (settings?.tags && settings.tags.length > 0) {
      postData.tags = settings.tags.map((tag: string) => ({ name: tag }));
    }

    // Authors (array of author IDs)
    if (settings?.authors && settings.authors.length > 0) {
      postData.authors = settings.authors.map((id: string) => ({ id }));
    }

    try {
      // Use Ghost Admin API to create post
      const createdPost = await api.posts.add(postData, { include: 'tags,authors' });

      if (!createdPost) {
        throw new Error('Failed to create Ghost post - no response');
      }

      return [
        {
          id: firstPost.id,
          status: 'completed',
          postId: String(createdPost.id),
          releaseURL: createdPost.url || `${credentials.domain}/${postSlug}/`,
        },
      ];
    } catch (err: any) {
      console.error('Ghost post creation error:', err?.message || err);
      throw new Error(`Failed to create Ghost post: ${err?.message || 'unknown error'}`);
    }
  }
}