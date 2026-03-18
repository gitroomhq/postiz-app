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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as jwt from 'jsonwebtoken';
import * as stream from 'stream';
import * as util from 'util';
import * as zlib from 'zlib';

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

      // Ghost Admin SDK doesn't expose tiers endpoint, but the API supports it
      // Make a direct HTTP call to /ghost/api/admin/tiers/
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      const response = await fetch(`${url}/ghost/api/admin/tiers/`, {
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Accept-Version': 'v6.0',
        },
      });

      if (!response.ok) {
        console.error('Ghost tiers fetch failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json() as { tiers: Array<{ id: string; name: string }> };
      const tiers = data.tiers || [];

      return tiers.map((tier) => ({
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

  @Tool({ description: 'Get Ghost themes', dataSchema: [] })
  async themes(token: string): Promise<Array<{ value: string; label: string; active: boolean }>> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      const response = await fetch(`${url}/ghost/api/admin/themes/`, {
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Accept-Version': 'v6.0',
        },
      });

      if (!response.ok) {
        console.error('Ghost themes fetch failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json() as { themes: Array<{ name: string; active?: boolean }> };
      const themes = data.themes || [];

      return themes.map((theme) => ({
        value: theme.name,
        label: theme.name,
        active: theme.active || false,
      }));
    } catch (err) {
      console.error('Ghost themes fetch error:', err);
      return [];
    }
  }

  @Tool({ description: 'Preview a Ghost post', dataSchema: [] })
  async preview(
    token: string,
    postData: {
      title: string;
      html?: string;
      mobiledoc?: string;
      lexical?: string;
    }
  ): Promise<{ previewUrl: string } | { error: string }> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      // Ghost preview API creates a temporary preview post
      // The preview endpoint is POST /ghost/api/admin/posts/?source=html
      const body: any = {
        posts: [{
          title: postData.title,
        }]
      };

      // Ghost accepts html, mobiledoc, or lexical format
      if (postData.html) {
        body.posts[0].html = postData.html;
      } else if (postData.mobiledoc) {
        body.posts[0].mobiledoc = postData.mobiledoc;
      } else if (postData.lexical) {
        body.posts[0].lexical = postData.lexical;
      }

      const response = await fetch(`${url}/ghost/api/admin/posts/?source=html&preview=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v6.0',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ghost preview failed:', response.status, errorText);
        return { error: `Preview failed: ${response.status}` };
      }

      const data = await response.json() as { posts: Array<{ id: string; uuid: string }> };
      const post = data.posts?.[0];

      if (!post) {
        return { error: 'No preview created' };
      }

      // Generate preview URL
      const previewUrl = `${url}/p/${post.uuid}/`;

      return { previewUrl };
    } catch (err: any) {
      console.error('Ghost preview error:', err);
      return { error: err?.message || 'Unknown error' };
    }
  }

  @Tool({ description: 'Get custom theme settings for the active theme (variants like colors, typography, layouts)', dataSchema: [] })
  async themeSettings(token: string): Promise<Array<{
    key: string;
    type: 'select' | 'boolean' | 'color' | 'text' | 'number';
    value: string | boolean | number;
    options?: string[];
    default?: string | boolean | number;
    group?: string;
    description?: string;
  }>> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      // Fetch custom theme settings for active theme
      const response = await fetch(`${url}/ghost/api/admin/custom_theme_settings/`, {
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Accept-Version': 'v6.0',
        },
      });

      if (!response.ok) {
        console.error('Ghost theme settings fetch failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json() as { custom_theme_settings: Array<any> };
      return (data.custom_theme_settings || []).map((setting) => ({
        key: setting.key,
        type: setting.type,
        value: setting.value,
        options: setting.options,
        default: setting.default,
        group: setting.group,
        description: setting.description,
      }));
    } catch (err) {
      console.error('Ghost theme settings fetch error:', err);
      return [];
    }
  }

  @Tool({ description: 'Update custom theme settings for the active theme', dataSchema: [] })
  async updateThemeSettings(
    token: string,
    settings: Array<{ key: string; value: string | boolean | number }>
  ): Promise<{ success: boolean; settings?: any[]; error?: string }> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      const response = await fetch(`${url}/ghost/api/admin/custom_theme_settings/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Content-Type': 'application/json',
          'Accept-Version': 'v6.0',
        },
        body: JSON.stringify({
          custom_theme_settings: settings,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ghost theme settings update failed:', response.status, errorText);
        return { success: false, error: `Update failed: ${response.status}` };
      }

      const data = await response.json() as { custom_theme_settings: Array<any> };
      return {
        success: true,
        settings: data.custom_theme_settings,
      };
    } catch (err: any) {
      console.error('Ghost theme settings update error:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  @Tool({ description: 'Activate a Ghost theme', dataSchema: [] })
  async activateTheme(
    token: string,
    themeName: string
  ): Promise<{ success: boolean; theme?: any; error?: string }> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      const response = await fetch(`${url}/ghost/api/admin/themes/activate/?name=${encodeURIComponent(themeName)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Ghost ${authToken}`,
          'Accept-Version': 'v6.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ghost theme activation failed:', response.status, errorText);
        return { success: false, error: `Activation failed: ${response.status}` };
      }

      const data = await response.json() as { themes: Array<any> };
      return {
        success: true,
        theme: data.themes?.[0],
      };
    } catch (err: any) {
      console.error('Ghost theme activation error:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  /**
   * Parse a Ghost theme ZIP file to extract theme metadata and custom settings.
   * This is used to preview theme settings before uploading to Ghost.
   * 
   * @param zipUrl - URL to the theme ZIP file
   * @returns Theme metadata including name, version, and custom settings
   */
  @Tool({ description: 'Parse a Ghost theme ZIP file to extract metadata and custom settings', dataSchema: [] })
  async parseThemeZip(
    zipUrl: string
  ): Promise<{
    success: boolean;
    theme?: {
      name: string;
      version?: string;
      description?: string;
      author?: string;
      customSettings?: Record<string, {
        type: 'select' | 'boolean' | 'color' | 'text' | 'number';
        options?: string[];
        default?: string | boolean | number;
        group?: string;
        description?: string;
      }>;
    };
    error?: string;
  }> {
    try {
      // Download the ZIP file
      const response = await fetch(zipUrl);
      if (!response.ok) {
        return { success: false, error: `Failed to download theme: ${response.status}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Use ADM-ZIP or similar to extract package.json
      // For now, we'll use Node's built-in zlib and a simple extraction
      const packageJson = await this.extractPackageJsonFromZip(buffer);
      
      if (!packageJson) {
        return { success: false, error: 'Could not find package.json in theme ZIP' };
      }

      const parsed = JSON.parse(packageJson);
      
      return {
        success: true,
        theme: {
          name: parsed.name,
          version: parsed.version,
          description: parsed.description,
          author: parsed.author,
          customSettings: parsed.config?.customSettings || {},
        },
      };
    } catch (err: any) {
      console.error('Theme ZIP parse error:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  /**
   * Upload a theme ZIP file to Ghost.
   * 
   * @param token - Access token
   * @param zipUrl - URL to download the theme ZIP from
   * @returns Uploaded theme info
   */
  @Tool({ description: 'Upload a Ghost theme ZIP file', dataSchema: [] })
  async uploadTheme(
    token: string,
    zipUrl: string
  ): Promise<{
    success: boolean;
    theme?: {
      name: string;
      active?: boolean;
    };
    error?: string;
  }> {
    try {
      const credentials = this.parseCredentials(token);
      const url = credentials.domain.replace(/\/$/, '');
      const authToken = this.generateAuthToken(credentials.adminApiKey);

      // Download the ZIP file
      const response = await fetch(zipUrl);
      if (!response.ok) {
        return { success: false, error: `Failed to download theme: ${response.status}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract filename from URL
      const urlPath = new URL(zipUrl).pathname;
      const filename = path.basename(urlPath) || `theme-${Date.now()}.zip`;
      
      // Write to temp file
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-theme-'));
      const tmpPath = path.join(tmpDir, filename);
      
      try {
        fs.writeFileSync(tmpPath, buffer);

        // Use FormData to upload
        const formData = new FormData();
        formData.append('theme', new Blob([buffer]), filename);

        const uploadResponse = await fetch(`${url}/ghost/api/admin/themes/upload/`, {
          method: 'POST',
          headers: {
            'Authorization': `Ghost ${authToken}`,
            'Accept-Version': 'v6.0',
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Theme upload failed:', uploadResponse.status, errorText);
          return { success: false, error: `Upload failed: ${uploadResponse.status}` };
        }

        const data = await uploadResponse.json() as { themes: Array<any> };
        const theme = data.themes?.[0];
        
        return {
          success: true,
          theme: {
            name: theme?.name,
            active: theme?.active,
          },
        };
      } finally {
        // Cleanup temp directory
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error('Theme upload error:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  /**
   * Extract package.json from a ZIP buffer.
   * Ghost themes have package.json at the root or in a subdirectory.
   */
  private async extractPackageJsonFromZip(buffer: Buffer): Promise<string | null> {
    try {
      // Use dynamic import for adm-zip (ESM compatible)
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(buffer);
      
      // Try root level first
      let entry = zip.getEntry('package.json');
      
      // If not at root, search in subdirectories (common for GitHub releases)
      if (!entry) {
        const entries = zip.getEntries();
        for (const e of entries) {
          if (e.entryName.endsWith('package.json') && e.entryName.split('/').length === 2) {
            entry = e;
            break;
          }
        }
      }
      
      if (!entry) {
        return null;
      }
      
      return entry.getData().toString('utf8');
    } catch (err) {
      // Fallback: manually parse with unzip
      console.error('ADM-ZIP extraction failed, trying manual extraction:', err);
      return this.extractPackageJsonManually(buffer);
    }
  }

  /**
   * Manual ZIP extraction fallback using Node's built-in zlib.
   */
  private extractPackageJsonManually(buffer: Buffer): string | null {
    // This is a simplified extraction - for full ZIP support, adm-zip is preferred
    // ZIP files have a central directory at the end
    try {
      // Find the end of central directory signature
      const eocdOffset = buffer.indexOf(Buffer.from([0x06, 0x05, 0x4b, 0x50]));
      if (eocdOffset === -1) {
        return null;
      }
      
      // For now, return null and let adm-zip handle it
      // Full ZIP parsing is complex - better to require the adm-zip dependency
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate JWT token from Admin API Key for direct API calls
   * The Ghost Admin SDK does this internally, but we need it for endpoints not in the SDK
   */
  private generateAuthToken(adminApiKey: string): string {
    const [id, secret] = adminApiKey.split(':');
    if (!id || !secret) {
      throw new Error('Invalid Admin API Key format');
    }

    // Create JWT token matching Ghost Admin API format
    // Audience is /admin/ for admin API calls
    return jwt.sign({}, Buffer.from(secret, 'hex'), {
      keyid: id,
      algorithm: 'HS256',
      expiresIn: '5m',
      audience: '/admin/'
    });
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
      
      // Extract filename from URL or generate one
      const urlPath = new URL(imageUrl).pathname;
      const filename = path.basename(urlPath) || `image-${Date.now()}.jpg`;
      
      // Write to temp file - Ghost SDK expects a file path, not a Buffer
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-upload-'));
      const tmpPath = path.join(tmpDir, filename);
      
      try {
        fs.writeFileSync(tmpPath, buffer);
        
        // Upload via Ghost Admin API using file path
        const result = await api.images.upload({
          file: tmpPath,
          filename,
          purpose: 'image',
        });
        
        return result?.url || null;
      } finally {
        // Cleanup temp directory
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Ghost image upload error:', err);
      return null;
    }
  }

  /**
   * Process inline images in HTML content by rehosting them to Ghost's image storage.
   * Ghost does NOT automatically rehost external images - they stay as external URLs
   * which can break if the source becomes unavailable.
   */
  private async processInlineImages(
    api: GhostAdminAPI,
    html: string
  ): Promise<string> {
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    const uploads: Map<string, Promise<string | null>> = new Map();
    
    // Find all image URLs
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const url = match[1];
      // Only process external URLs (not already Ghost-hosted)
      if (!url.includes('/content/images/') && !uploads.has(url)) {
        uploads.set(url, this.uploadImage(api, url));
      }
    }
    
    // Wait for all uploads to complete
    const urlMappings: Map<string, string> = new Map();
    for (const [oldUrl, uploadPromise] of uploads) {
      const newUrl = await uploadPromise;
      if (newUrl) {
        urlMappings.set(oldUrl, newUrl);
      }
    }
    
    // Replace URLs in HTML
    let processedHtml = html;
    for (const [oldUrl, newUrl] of urlMappings) {
      // Replace all occurrences of this URL
      processedHtml = processedHtml.split(oldUrl).join(newUrl);
    }
    
    return processedHtml;
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

    // Process inline images - rehost external images to Ghost's storage
    // Ghost does NOT auto-rehost external images, so we handle it here
    const processedHtml = await this.processInlineImages(api, firstPost.message);

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
      html: processedHtml,  // Use processed HTML with rehosted images
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

    // Tiers for paid content (if visibility is 'paid')
    if (settings?.tiers && settings.tiers.length > 0) {
      postData.tiers = settings.tiers.map((tierId: string) => ({ id: tierId }));
    }

    // Newsletter
    if (settings?.newsletter_id) {
      postData.newsletter = { id: settings.newsletter_id };
    }

    // Email settings
    if (settings?.email_subject) {
      postData.email_subject = settings.email_subject;
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

    // Scheduled publishing - use Ghost's native scheduling
    // Priority: 1) settings.published_at, 2) postDetails.publishDate from Postiz
    // Ghost expects ISO 8601 format for published_at
    const scheduledDate = settings?.published_at 
      ? new Date(settings.published_at)
      : firstPost.publishDate 
        ? new Date(firstPost.publishDate)
        : null;
    
    if (scheduledDate) {
      postData.published_at = scheduledDate.toISOString();
      // Use 'scheduled' status if publishing in the future
      if (scheduledDate > new Date() && settings?.status !== 'draft') {
        postData.status = 'scheduled';
      }
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
      // IMPORTANT: source: 'html' tells Ghost to convert HTML to Lexical/Mobiledoc format
      const createdPost = await api.posts.add(postData, { 
        source: 'html',
        include: 'tags,authors' 
      });

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

  /**
   * Update an existing Ghost post
   * Used for editing scheduled/draft posts or changing post status
   */
  async update(
    id: string,
    accessToken: string,
    ghostPostId: string,
    updates: {
      title?: string;
      html?: string;
      status?: 'draft' | 'published' | 'scheduled';
      published_at?: string;
      feature_image?: string;
      visibility?: string;
      tags?: string[];
      authors?: string[];
      [key: string]: any;
    }
  ): Promise<PostResponse> {
    const credentials = this.parseCredentials(accessToken);
    const api = this.createAdminAPI(credentials);

    const updateData: any = { id: ghostPostId };

    // Apply updates
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.html !== undefined) updateData.html = updates.html;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.published_at !== undefined) {
      updateData.published_at = updates.published_at;
      // Auto-set status to 'scheduled' if published_at is in the future
      const publishDate = new Date(updates.published_at);
      if (publishDate > new Date() && updates.status !== 'draft') {
        updateData.status = 'scheduled';
      }
    }
    if (updates.feature_image !== undefined) updateData.feature_image = updates.feature_image;
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility;
    if (updates.tags !== undefined) {
      updateData.tags = updates.tags.map((tag: string) => ({ name: tag }));
    }
    if (updates.authors !== undefined) {
      updateData.authors = updates.authors.map((authorId: string) => ({ id: authorId }));
    }

    // Copy any additional fields
    for (const [key, value] of Object.entries(updates)) {
      if (!['title', 'html', 'status', 'published_at', 'feature_image', 'visibility', 'tags', 'authors'].includes(key)) {
        updateData[key] = value;
      }
    }

    try {
      // Ghost requires updated_at for optimistic concurrency control
      // Fetch current post to get its updated_at timestamp
      const currentPost = await api.posts.read({ id: ghostPostId }, { include: 'tags,authors' });
      if (!currentPost) {
        throw new Error('Post not found');
      }
      updateData.updated_at = currentPost.updated_at;

      const updatedPost = await api.posts.edit(updateData, {
        source: 'html',
        include: 'tags,authors'
      });

      if (!updatedPost) {
        throw new Error('Failed to update Ghost post - no response');
      }

      return {
        id,
        postId: String(updatedPost.id),
        releaseURL: updatedPost.url || '',
        status: updatedPost.status || 'updated',
      };
    } catch (err: any) {
      console.error('Ghost post update error:', err?.message || err);
      throw new Error(`Failed to update Ghost post: ${err?.message || 'unknown error'}`);
    }
  }

  /**
   * Delete a Ghost post
   * Used for canceling scheduled posts or removing drafts
   */
  async delete(
    accessToken: string,
    ghostPostId: string,
    internalId?: string,
    integration?: Integration
  ): Promise<{ id: string; success: boolean }> {
    const credentials = this.parseCredentials(accessToken);
    const api = this.createAdminAPI(credentials);

    try {
      await api.posts.delete({ id: ghostPostId });
      return { id: internalId || '', success: true };
    } catch (err: any) {
      console.error('Ghost post deletion error:', err?.message || err);
      throw new Error(`Failed to delete Ghost post: ${err?.message || 'unknown error'}`);
    }
  }

  /**
   * Get the status of a Ghost post
   * Returns: draft, published, scheduled, or sent (for email newsletters)
   */
  async getStatus(
    accessToken: string,
    ghostPostId: string,
    internalId?: string,
    integration?: Integration
  ): Promise<{
    id: string;
    status: 'draft' | 'published' | 'scheduled' | 'sent';
    publishedAt?: string;
    url?: string;
    title?: string;
  }> {
    const credentials = this.parseCredentials(accessToken);
    const api = this.createAdminAPI(credentials);

    try {
      const post = await api.posts.read({ id: ghostPostId }, { include: 'tags,authors' });

      if (!post) {
        throw new Error('Post not found');
      }

      return {
        id: String(post.id),
        status: post.status,
        publishedAt: post.published_at,
        url: post.url,
        title: post.title,
      };
    } catch (err: any) {
      console.error('Ghost post status error:', err?.message || err);
      throw new Error(`Failed to get Ghost post status: ${err?.message || 'unknown error'}`);
    }
  }

  /**
   * Change a post's status
   * - draft → published (publish now)
   * - scheduled → draft (cancel schedule)
   * - published → draft (unpublish)
   * - any status → scheduled (with published_at)
   */
  async changeStatus(
    accessToken: string,
    ghostPostId: string,
    newStatus: 'draft' | 'published' | 'scheduled',
    publishedAt?: string,
    internalId?: string,
    integration?: Integration
  ): Promise<PostResponse> {
    const credentials = this.parseCredentials(accessToken);
    const api = this.createAdminAPI(credentials);

    const updateData: any = {
      id: ghostPostId,
      status: newStatus,
    };

    // For scheduled posts, include published_at
    if (newStatus === 'scheduled' && publishedAt) {
      updateData.published_at = publishedAt;
    }

    // For published status, clear published_at if not provided (publish now)
    if (newStatus === 'published') {
      updateData.published_at = publishedAt || new Date().toISOString();
    }

    try {
      // Ghost requires updated_at for optimistic concurrency control
      // Fetch current post to get its updated_at timestamp
      const currentPost = await api.posts.read({ id: ghostPostId });
      if (!currentPost) {
        throw new Error('Post not found');
      }
      updateData.updated_at = currentPost.updated_at;

      const updatedPost = await api.posts.edit(updateData, {
        include: 'tags,authors'
      });

      if (!updatedPost) {
        throw new Error('Failed to change Ghost post status - no response');
      }

      return {
        id: internalId || '',
        postId: String(updatedPost.id),
        releaseURL: updatedPost.url || '',
        status: updatedPost.status,
      };
    } catch (err: any) {
      console.error('Ghost post status change error:', err?.message || err);
      throw new Error(`Failed to change Ghost post status: ${err?.message || 'unknown error'}`);
    }
  }
}
