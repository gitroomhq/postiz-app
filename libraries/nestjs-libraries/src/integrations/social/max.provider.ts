import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import axios from 'axios';
import mime from 'mime';
import FormData from 'form-data';
import * as fs from 'fs';
import striptags from 'striptags';

export class MaxProvider extends SocialAbstract implements SocialProvider {
  identifier = 'max';
  name = 'MAX';
  isBetweenSteps = false;
  isWeb3 = true;
  scopes = [] as string[];
  editor = 'html' as const;

  private baseUrl = 'https://api.max.ru/bot/v1';

  maxLength() {
    return 4096;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: refreshToken,
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async generateAuthUrl() {
    return {
      url: '',
      codeVerifier: '',
      state: '',
    };
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const token = params.code;

    const response = await axios.get(`${this.baseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const botInfo = response.data;

    return {
      id: String(botInfo.id || botInfo.user_id || 'max_bot'),
      name: botInfo.name || botInfo.first_name || 'MAX Bot',
      accessToken: token,
      refreshToken: '',
      expiresIn: 0,
      picture: botInfo.photo_url || '',
      username: botInfo.username || 'max_bot',
    };
  }

  formatMaxText(html: string): string {
    if (!html) return '';
    let text = html
      .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n<b>$1</b>\n')
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n')
      .replace(/<\/?(ul|ol)[^>]*>/gi, '')
      .replace(/<p><br\s*\/?>\s*<\/p>/gi, '\n')
      .replace(/<p>\s*<\/p>/gi, '\n')
      .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n')
      .replace(/<\/?p[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return striptags(text, [
      'b',
      'strong',
      'i',
      'em',
      'u',
      'ins',
      's',
      'del',
      'strike',
      'code',
      'pre',
      'mark',
      'blockquote',
      'a',
    ]);
  }

  private getFilePath(mediaPath: string): string {
    const frontendURL = process.env.FRONTEND_URL || 'http://localhost:5000';
    let localPath = mediaPath;
    if (localPath.startsWith(frontendURL)) {
      localPath = localPath.replace(frontendURL, '');
    }
    if (localPath.startsWith('/uploads/')) {
      localPath = `/app/apps/frontend/public${localPath}`;
    }
    return localPath;
  }

  private async uploadMedia(token: string, mediaPath: string, type: 'image' | 'video' | 'file') {
    const resolvedPath = this.getFilePath(mediaPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Media file not found at ${resolvedPath}`);
      return null;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(resolvedPath));
    form.append('type', type);

    const uploadRes = await axios.post(`${this.baseUrl}/files`, form, {
      headers: {
        Authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    });

    return uploadRes.data?.file_id || uploadRes.data?.id || null;
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    const [firstPost] = postDetails;
    const channelId = id;
    const mediaFiles = firstPost.media || [];
    const text = this.formatMaxText(firstPost.message || '');

    const fileIds: string[] = [];
    for (const media of mediaFiles) {
      const mimeType = mime.getType(media.path) || '';
      let type: 'image' | 'video' | 'file' = 'file';
      if (mimeType.startsWith('image/')) type = 'image';
      else if (mimeType.startsWith('video/')) type = 'video';

      const fileId = await this.uploadMedia(accessToken, media.path, type);
      if (fileId) {
        fileIds.push(fileId);
      }
    }

    const payload: any = {
      chat_id: channelId,
      text: text,
      parse_mode: 'HTML',
    };

    if (fileIds.length > 0) {
      payload.file_ids = fileIds;
    }

    const response = await axios.post(`${this.baseUrl}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data?.message_id || response.data?.id;

    return [
      {
        id: firstPost.id,
        postId: String(messageId || 'max_post'),
        releaseURL: `https://max.ru/channel/${channelId}/${messageId || ''}`,
        status: 'completed',
      },
    ];
  }

  async updateMessage(
    accessToken: string,
    messageId: string,
    postDetails: PostDetails
  ): Promise<boolean> {
    const text = this.formatMaxText(postDetails.message || '');
    try {
      await axios.put(
        `${this.baseUrl}/messages/${messageId}`,
        {
          text: text,
          parse_mode: 'HTML',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return true;
    } catch (e) {
      console.error('Error updating MAX message:', e);
      return false;
    }
  }
}
