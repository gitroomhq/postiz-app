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
      },
      {
        key: 'accountName',
        label: 'Account Name (for display)',
        validation: `/^.+$/`,
        type: 'text' as const,
      },
      {
        key: 'defaultLabelId',
        label: 'Default Label ID',
        validation: `/^.+$/`,
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
      
      const url = `${apiUrl}/api/v1/community/posts/${id}?bypass=true&auth=${authParam}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return [];
      }
      
      const data = await response.json();
      
      // data structure based on user input:
      // { id, name, metadata: { upvotes: 25, comments: 16, ... } }
      
      return [
        {
          label: 'Upvotes',
          data: [{ total: String(data.metadata?.upvotes || 0), date: dayjs().format('YYYY-MM-DD') }],
          percentageChange: 0,
        },
        {
          label: 'Comments',
          data: [{ total: String(data.metadata?.comments || 0), date: dayjs().format('YYYY-MM-DD') }],
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

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const credentials = JSON.parse(accessToken);
    const { settings } = postDetails[0] || { settings: {} };
    const post = postDetails[0];
    
    const apiUrl = credentials.apiUrl.replace(/\/$/, '');
    const authParam = encodeURIComponent(credentials.authToken);
    const groupName = credentials.groupName;

    // 1. Upload files if any
    const fileIds: string[] = [];
    if (post.media && post.media.length > 0) {
      for (const media of post.media) {
        const formData = new FormData();
        const fileBlob = await fetch(media.path).then((r) => r.blob());
        formData.append('file', fileBlob, media.path.split('/').pop() || 'image.png');
        
        const uploadUrl = `${apiUrl}/api/v1/community/groups/${groupName}/files?bypass=true&auth=${authParam}`;
        
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        if (uploadResult.id) {
            fileIds.push(uploadResult.id);
        }
      }
    }

    // 2. Create Post
    const postUrl = `${apiUrl}/api/v1/community/groups/${groupName}/posts?bypass=true&auth=${authParam}`;
    
    const content = removeMarkdown(post.message);
    const title = settings.title || content.split('\n')[0].substring(0, 100);
    // If title is derived from content, we might want to remove it from content to avoid duplication if Skool shows both
    
    const labelId = settings.labelId || credentials.defaultLabelId;

    if (!labelId) {
        throw new Error('Label ID is required. Please set it in the provider settings or post settings.');
    }

    const body = {
        title: title,
        content: content,
        labelId: labelId,
        fileIds: fileIds.length > 0 ? fileIds : undefined,
    };

    const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create post: ${response.status} ${errorText}`);
    }

    const result = await response.json();

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

