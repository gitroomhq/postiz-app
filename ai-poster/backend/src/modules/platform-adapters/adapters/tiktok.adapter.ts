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
export class TikTokAdapter implements PlatformAdapterInterface {
  platform = 'tiktok';

  private static readonly MAX_CHARS = 2000;
  private static readonly MIN_VIDEO_HEIGHT = 720;
  private static readonly MAX_HASHTAGS = 100;

  getMaxChars(): number {
    return TikTokAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'privacy',
        label: 'Privacy Level',
        type: 'select',
        required: false,
        options: [
          { label: 'Public', value: 'PUBLIC_TO_EVERYONE' },
          { label: 'Friends', value: 'MUTUAL_FOLLOW_FRIENDS' },
          { label: 'Private', value: 'SELF_ONLY' },
        ],
        defaultValue: 'PUBLIC_TO_EVERYONE',
      },
      {
        key: 'allowDuet',
        label: 'Allow Duet',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'allowStitch',
        label: 'Allow Stitch',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'allowComments',
        label: 'Allow Comments',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'brandContentToggle',
        label: 'Brand Content',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'brandOrganicToggle',
        label: 'Brand Organic',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!media || media.length === 0) {
      results.push({
        field: 'media',
        message: 'TikTok requires a video or image.',
        severity: 'error',
      });
    }

    if (content && content.length > TikTokAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Caption exceeds ${TikTokAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media) {
      for (const item of media) {
        if (
          (item.type === 'video' || item.mimeType?.startsWith('video')) &&
          item.height &&
          item.height < TikTokAdapter.MIN_VIDEO_HEIGHT
        ) {
          results.push({
            field: 'media',
            message: `Video "${item.name || 'unknown'}" is below minimum resolution of ${TikTokAdapter.MIN_VIDEO_HEIGHT}p (${item.height}p).`,
            severity: 'error',
          });
        }
      }
    }

    if (content) {
      const hashtags = content.match(/#\w+/g) || [];
      if (hashtags.length > TikTokAdapter.MAX_HASHTAGS) {
        results.push({
          field: 'content',
          message: `Too many hashtags (${hashtags.length}). Maximum is ${TikTokAdapter.MAX_HASHTAGS}.`,
          severity: 'warning',
        });
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    if (text.length > TikTokAdapter.MAX_CHARS) {
      text = text.substring(0, TikTokAdapter.MAX_CHARS - 3) + '...';
    }

    const formattedMedia = raw.media?.map((m) => {
      const processed = { ...m };
      if (
        (m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))) &&
        m.mimeType &&
        !m.mimeType.includes('jpeg') &&
        !m.mimeType.includes('jpg')
      ) {
        processed.convertTo = 'image/jpeg';
        processed.conversionRequired = true;
      }
      return processed;
    });

    return {
      content: text,
      media: formattedMedia,
      settings: raw.settings,
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
