import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { Integration } from '@prisma/client';
import { SkoolSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/skool.settings.dto';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import dayjs from 'dayjs';
import removeMarkdown from 'remove-markdown';

import { Tool } from '@gitroom/nestjs-libraries/integrations/tool.decorator';

export class SkoolProvider extends SocialAbstract implements SocialProvider {
  identifier = 'skool';
  name = 'Skool';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = [] as string[];
  dto = SkoolSettingsDto;

  maxLength() {
    return 100000;
  }

  async generateAuthUrl() {
    return {
      url: '',
      codeVerifier: makeId(10),
      state: makeId(6),
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
        key: 'apiUrl',
        label: 'API URL',
        validation: `/^https?:\\/\\/.+$/`,
        type: 'text' as const,
        defaultValue: 'http://localhost:3000',
      },
      {
        key: 'authToken',
        label: 'Auth Token (Base64)',
        validation: `/^.+$/`,
        type: 'password' as const,
      },
      {
        key: 'groupName',
        label: 'Group Name (slug)',
        validation: `/^[a-zA-Z0-9-]+$/`,
        type: 'text' as const,
        defaultValue: 'shopify-for-beginners',
      },
      {
        key: 'accountName',
        label: 'Account Name (for display)',
        validation: `/^.+$/`,
        type: 'text' as const,
      },
      {
        key: 'defaultLabelId',
        label: 'Default Label ID (optional)',
        validation: ``,
        type: 'text' as const,
      },
      {
        key: 'availableLabels',
        label: 'Available Labels (format: id:name, id2:name2)',
        validation: ``,
        type: 'text' as const,
      },
    ];
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    try {
      const body = JSON.parse(Buffer.from(params.code, 'base64').toString());

      // Basic validation - try to list posts or something simple to verify credentials
      // But for now we will just trust the user inputs as it is a custom integration
      // If we want to validate we can try to fetch the group info:
      // GET /api/v1/community/groups/:group?bypass=true&auth=:auth

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: JSON.stringify(body),
        id: makeId(10),
        name: body.accountName || body.groupName,
        picture: '',
        username: body.groupName,
      };
    } catch (err) {
      return 'Invalid credentials';
    }
  }

  @Tool({ description: 'Get available labels', dataSchema: [] })
  async getLabels(accessToken: string) {
    const credentials = JSON.parse(accessToken);
    const availableLabels = credentials.availableLabels || '';

    if (!availableLabels) {
      return [];
    }

    return availableLabels.split(',').map((l: string) => {
      const [value, label] = l.split(':').map((s) => s.trim());
      if (!value || !label) return null;
      return { value, label };
    }).filter(Boolean);
  }

  @Tool({ description: 'Check if notify all is available', dataSchema: [] })
  async checkNotify(accessToken: string) {
    const credentials = JSON.parse(accessToken);
    const apiUrl = credentials.apiUrl.replace(/\/$/, '');
    const authParam = encodeURIComponent(credentials.authToken);
    const groupName = credentials.groupName;

    const url = `${apiUrl}/api/v1/community/groups/${groupName}/notify?bypass=true&auth=${authParam}`;
    console.log('Checking notify status for URL:', url);

    try {
      const response = await fetch(url);
      const text = await response.text();
      console.log('Skool Notify Response:', response.status, text);

      if (!response.ok) {
        try {
          const json = JSON.parse(text);
          // If Skool returns the status object even with a 400 error (e.g. when limit exceeded)
          if (json.wait_time || json.can_notify !== undefined) {
            return json;
          }
        } catch (e) {
          // ignore
        }
        return { can_notify: false, readable_wait_time: 'Unknown', error: `Status: ${response.status}, Body: ${text}` };
      }
      return JSON.parse(text);
    } catch (err) {
      console.error('Skool Notify Error:', err);
      return { can_notify: false, readable_wait_time: 'Error', error: String(err) };
    }
  }

  async analytics(id: string, accessToken: string, date: number) {
    const credentials = JSON.parse(accessToken);
    const apiUrl = credentials.apiUrl.replace(/\/$/, '');
    const authParam = encodeURIComponent(credentials.authToken);
    const groupName = credentials.groupName;

    try {
      // We need to find the post title/slug to fetch details. 
      // Postiz stores the postId (which is Skool's ID) in the 'id' parameter here? 
      // Actually 'id' is the postId returned from post() method.

      // If Skool API requires slug + group to fetch post, we might be in trouble if we only have ID.
      // However, the user provided an example:
      // GET /api/v1/community/groups/:group/posts/:slug

      // If we don't have the slug stored, we might need to fetch by ID if possible or store slug in releaseURL?
      // The releaseURL is constructed as: ${apiUrl}/community/${groupName}/posts/${result.id}

      // Wait, the user provided this CURL for getting a post:
      // curl -X 'GET' 'http://.../posts/just-a-note-from-the-creators?bypass=true&auth=...'

      // If we only have the ID (219ccf8f...), we might need an endpoint that supports ID lookup.
      // Or we assume we can't get analytics without the slug.

      // BUT, the user asked "if we are getting post stats".
      // And the response payload has "upvotes" and "comments".

      // Let's assume for now we can't easily get analytics unless we have an endpoint that takes ID.
      // If we MUST use slug, we would have needed to store it.

      // Actually, let's look at the 'post()' return. We return 'postId: result.id'.
      // If Skool supports getting post by ID (e.g. /api/v1/community/posts/:id), that would be best.
      // The DELETE example uses ID: /api/v1/community/posts/:id
      // Maybe GET works there too?

      const url = `${apiUrl}/api/v1/community/groups/${groupName}/posts/${id}?bypass=true&auth=${authParam}`;
      const response = await fetch(url);

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const post = data.post_tree?.post;

      // data structure based on user input:
      // { id, name, metadata: { upvotes: 25, comments: 16, ... } }

      return [
        {
          label: 'Upvotes',
          data: [{ total: String(post.metadata?.upvotes || 0), date: dayjs().format('YYYY-MM-DD') }],
          percentageChange: 0,
        },
        {
          label: 'Comments',
          data: [{ total: String(post.metadata?.comments || 0), date: dayjs().format('YYYY-MM-DD') }],
          percentageChange: 0,
        },
      ];
    } catch (e) {
      return [];
    }
  }

  async deletePost(id: string, accessToken: string) {
    const credentials = JSON.parse(accessToken);
    const apiUrl = credentials.apiUrl.replace(/\/$/, '');
    const authParam = encodeURIComponent(credentials.authToken);
    const groupName = credentials.groupName;

    const url = `${apiUrl}/api/v1/community/posts/${id}?bypass=true&auth=${authParam}`;
    await fetch(url, {
      method: 'DELETE',
    });
  }

  async changeNickname(id: string, accessToken: string, name: string) {
    return { name };
  }

  async changeProfilePicture(id: string, accessToken: string, url: string) {
    return { url };
  }

  // Helper to check if a file is a video based on extension or mime type
  private isVideoFile(path: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v', '.wmv', '.flv'];
    const lowerPath = path.toLowerCase();
    return videoExtensions.some(ext => lowerPath.includes(ext));
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    console.log('Skool post() called with id:', id);
    console.log('Skool postDetails:', JSON.stringify(postDetails, null, 2));
    
    const credentials = JSON.parse(accessToken);
    const { settings } = postDetails[0] || { settings: {} };
    const post = postDetails[0];

    console.log('Skool settings:', JSON.stringify(settings, null, 2));

    const apiUrl = credentials.apiUrl.replace(/\/$/, '');
    const authParam = encodeURIComponent(credentials.authToken);
    const groupName = credentials.groupName;

    console.log('Skool API URL:', apiUrl, 'Group:', groupName);

    // 1. Separate media into videos and files (images)
    const fileIds: string[] = [];
    const videoIds: string[] = [];

    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        const isVideo = this.isVideoFile(media.path);
        const formData = new FormData();
        const fileBlob = await fetch(media.path).then((r) => r.blob());
        const fileName = media.path.split('/').pop() || (isVideo ? 'video.mp4' : 'image.png');
        formData.append('file', fileBlob, fileName);

        if (isVideo) {
          // Upload video to /videos endpoint
          const uploadUrl = `${apiUrl}/api/v1/community/groups/${groupName}/videos?bypass=true&auth=${authParam}`;
          console.log('Skool uploading video to:', uploadUrl);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Skool video upload error:', errorText);
            throw new Error(`Failed to upload video: ${uploadResponse.status} ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('Skool video upload result:', JSON.stringify(uploadResult, null, 2));
          
          if (uploadResult.video_id) {
            videoIds.push(uploadResult.video_id);
          }
        } else {
          // Upload image/file to /files endpoint
          const uploadUrl = `${apiUrl}/api/v1/community/groups/${groupName}/files?bypass=true&auth=${authParam}`;
          console.log('Skool uploading file to:', uploadUrl);

          const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Skool file upload error:', errorText);
            throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`);
          }

          const uploadResult = await uploadResponse.json();
          console.log('Skool file upload result:', JSON.stringify(uploadResult, null, 2));
          
          if (uploadResult.id) {
            fileIds.push(uploadResult.id);
          }
        }
      }
    }

    console.log('Skool fileIds:', fileIds, 'videoIds:', videoIds);

    // 2. Create Post
    const postUrl = `${apiUrl}/api/v1/community/groups/${groupName}/posts?bypass=true&auth=${authParam}${settings.notify ? '&notify=true' : ''}`;

    const content = removeMarkdown(post.message);
    const title = settings.title || content.split('\n')[0].substring(0, 100);
    // If title is derived from content, we might want to remove it from content to avoid duplication if Skool shows both

    // settings.label can be either an object with .value (from SelectLabel component) or a string
    const labelId = (typeof settings.label === 'object' ? settings.label?.value : settings.label) || settings.labelId || credentials.defaultLabelId;

    console.log('Skool labelId:', labelId, 'from settings.label:', settings.label, 'settings.labelId:', settings.labelId, 'credentials.defaultLabelId:', credentials.defaultLabelId);

    if (!labelId) {
      console.error('Skool post failed: Label ID is required');
      throw new Error('Label ID is required. Please select a label from the dropdown or set a Label ID in the post settings.');
    }

    const body: {
      title: string;
      content: string;
      labelId: string;
      fileIds?: string[];
      videoIds?: string;
    } = {
      title: title,
      content: content,
      labelId: labelId,
    };

    // Add fileIds as array if we have any
    if (fileIds.length > 0) {
      body.fileIds = fileIds;
    }

    // Add videoIds as comma-separated string if we have any
    if (videoIds.length > 0) {
      body.videoIds = videoIds.join(',');
    }

    console.log('Skool posting to URL:', postUrl);
    console.log('Skool post body:', JSON.stringify(body, null, 2));

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Skool post response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Skool post error:', errorText);
      if (errorText.includes('Notify limit exceeded')) {
        const json = JSON.parse(errorText);
        throw new Error(`Notify limit exceeded. Next available time: ${json.next_available_time} (in ${json.readable_wait_time})`);
      }
      throw new Error(`Failed to create post: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('Skool post success, result:', JSON.stringify(result, null, 2));

    return [
      {
        id: post.id,
        status: 'completed',
        postId: result.id,
        releaseURL: `${apiUrl}/community/${groupName}/posts/${result.id}`, // Estimate URL
      },
    ];
  }
}

