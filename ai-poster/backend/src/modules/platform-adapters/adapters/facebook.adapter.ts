import { Injectable } from '@nestjs/common';
import {
  PlatformAdapterInterface,
  RawContent,
  FormattedPost,
  ValidationResult,
  SettingsField,
  AdapterOptions,
} from '../adapter.interface';

@Injectable()
export class FacebookAdapter implements PlatformAdapterInterface {
  platform = 'facebook';

  private static readonly MAX_CHARS = 63206;
  private static readonly MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

  getMaxChars(): number {
    return FacebookAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'privacy',
        label: 'Privacy',
        type: 'select',
        required: false,
        options: [
          { label: 'Public', value: 'EVERYONE' },
          { label: 'Friends', value: 'ALL_FRIENDS' },
          { label: 'Only Me', value: 'SELF' },
        ],
        defaultValue: 'EVERYONE',
      },
      {
        key: 'linkUrl',
        label: 'Link URL',
        type: 'text',
        required: false,
      },
      {
        key: 'pageId',
        label: 'Page ID',
        type: 'text',
        required: false,
      },
      {
        key: 'targeting',
        label: 'Target Audience',
        type: 'select',
        required: false,
        options: [
          { label: 'Everyone', value: 'everyone' },
          { label: 'Fans Only', value: 'fans' },
        ],
        defaultValue: 'everyone',
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if ((!content || content.trim().length === 0) && (!media || media.length === 0)) {
      results.push({
        field: 'content',
        message: 'Facebook post must have text or media.',
        severity: 'error',
      });
    }

    if (content && content.length > FacebookAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${FacebookAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media) {
      for (const item of media) {
        if (
          (item.type === 'image' || (!item.type && !item.mimeType?.startsWith('video'))) &&
          item.size &&
          item.size > FacebookAdapter.MAX_PHOTO_SIZE_BYTES
        ) {
          results.push({
            field: 'media',
            message: `Photo "${item.name || 'unknown'}" exceeds 4MB limit (${(item.size / (1024 * 1024)).toFixed(2)}MB).`,
            severity: 'error',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    if (text.length > FacebookAdapter.MAX_CHARS) {
      text = text.substring(0, FacebookAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (settings.linkUrl) {
      settings.attachmentType = 'LINK';
      settings.attachmentUrl = settings.linkUrl;
    }

    return {
      content: text,
      title: raw.title,
      media: raw.media,
      settings,
    };
  }

  splitIntoThread(content: string): string[] {
    return [content];
  }

  private stripHtml(text: string): string {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
