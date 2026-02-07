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
export class InstagramAdapter implements PlatformAdapterInterface {
  platform = 'instagram';

  private static readonly MAX_CHARS = 2200;
  private static readonly MAX_HASHTAGS = 30;
  private static readonly MIN_ASPECT_RATIO = 4 / 5; // 0.8 (portrait)
  private static readonly MAX_ASPECT_RATIO = 1.91; // landscape
  private static readonly MAX_CAROUSEL_ITEMS = 10;

  getMaxChars(): number {
    return InstagramAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'postType',
        label: 'Post Type',
        type: 'select',
        required: false,
        options: [
          { label: 'Feed Post', value: 'FEED' },
          { label: 'Carousel', value: 'CAROUSEL' },
          { label: 'Reels', value: 'REELS' },
          { label: 'Stories', value: 'STORIES' },
        ],
        defaultValue: 'FEED',
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        required: false,
      },
      {
        key: 'disableComments',
        label: 'Disable Comments',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'shareToFeed',
        label: 'Share Reels to Feed',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'coverImageTimestamp',
        label: 'Cover Image Timestamp (seconds)',
        type: 'number',
        required: false,
        defaultValue: 0,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!media || media.length === 0) {
      results.push({
        field: 'media',
        message: 'Instagram posts require at least one image or video.',
        severity: 'error',
      });
    }

    if (content && content.length > InstagramAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Caption exceeds ${InstagramAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (content) {
      const hashtags = content.match(/#\w+/g) || [];
      if (hashtags.length > InstagramAdapter.MAX_HASHTAGS) {
        results.push({
          field: 'content',
          message: `Too many hashtags (${hashtags.length}). Maximum is ${InstagramAdapter.MAX_HASHTAGS}.`,
          severity: 'error',
        });
      }
    }

    if (media) {
      if (media.length > InstagramAdapter.MAX_CAROUSEL_ITEMS) {
        results.push({
          field: 'media',
          message: `Maximum ${InstagramAdapter.MAX_CAROUSEL_ITEMS} items in a carousel. Found ${media.length}.`,
          severity: 'error',
        });
      }

      for (const item of media) {
        if (item.width && item.height) {
          const aspectRatio = item.width / item.height;
          if (
            aspectRatio < InstagramAdapter.MIN_ASPECT_RATIO ||
            aspectRatio > InstagramAdapter.MAX_ASPECT_RATIO
          ) {
            results.push({
              field: 'media',
              message: `Media "${item.name || 'unknown'}" has aspect ratio ${aspectRatio.toFixed(2)}. Must be between 4:5 (${InstagramAdapter.MIN_ASPECT_RATIO.toFixed(2)}) and 1.91:1.`,
              severity: 'warning',
            });
          }
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    if (text.length > InstagramAdapter.MAX_CHARS) {
      text = text.substring(0, InstagramAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (raw.media && raw.media.length > 1) {
      settings.postType = settings.postType || 'CAROUSEL';
    }

    if (raw.media && raw.media.length === 1) {
      const item = raw.media[0];
      if (item.type === 'video' || item.mimeType?.startsWith('video')) {
        settings.postType = settings.postType || 'REELS';
      }
    }

    const formattedMedia = raw.media?.map((m) => {
      const processed = { ...m };
      if (m.width && m.height) {
        const aspectRatio = m.width / m.height;
        if (aspectRatio < InstagramAdapter.MIN_ASPECT_RATIO) {
          processed.cropRequired = true;
          processed.targetAspectRatio = InstagramAdapter.MIN_ASPECT_RATIO;
        } else if (aspectRatio > InstagramAdapter.MAX_ASPECT_RATIO) {
          processed.cropRequired = true;
          processed.targetAspectRatio = InstagramAdapter.MAX_ASPECT_RATIO;
        }
      }
      return processed;
    });

    return {
      content: text,
      media: formattedMedia,
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
