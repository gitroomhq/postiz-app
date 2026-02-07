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
export class TwitterAdapter implements PlatformAdapterInterface {
  platform = 'twitter';

  private static readonly MAX_CHARS = 280;
  private static readonly MAX_CHARS_PREMIUM = 4000;
  private static readonly MAX_IMAGES = 4;
  private static readonly MAX_IMAGE_WIDTH = 1000;
  private static readonly MAX_VIDEO_COUNT = 1;

  getMaxChars(): number {
    return TwitterAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'isPremium',
        label: 'Premium Account',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'replyToTweetId',
        label: 'Reply To Tweet ID',
        type: 'text',
        required: false,
      },
      {
        key: 'quoteTweetId',
        label: 'Quote Tweet ID',
        type: 'text',
        required: false,
      },
      {
        key: 'sensitiveContent',
        label: 'Mark as Sensitive',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];
    const maxChars = TwitterAdapter.MAX_CHARS;

    if (!content || content.trim().length === 0) {
      if (!media || media.length === 0) {
        results.push({
          field: 'content',
          message: 'Tweet must have text or media.',
          severity: 'error',
        });
      }
    }

    if (content && content.length > maxChars) {
      results.push({
        field: 'content',
        message: `Content exceeds ${maxChars} characters (${content.length}). Consider using a thread.`,
        severity: 'warning',
      });
    }

    if (media && media.length > 0) {
      const images = media.filter(
        (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
      );
      const videos = media.filter(
        (m) => m.type === 'video' || m.mimeType?.startsWith('video')
      );

      if (images.length > 0 && videos.length > 0) {
        results.push({
          field: 'media',
          message: 'Twitter does not allow mixing images and videos in a single tweet.',
          severity: 'error',
        });
      }

      if (images.length > TwitterAdapter.MAX_IMAGES) {
        results.push({
          field: 'media',
          message: `Maximum ${TwitterAdapter.MAX_IMAGES} images allowed per tweet. Found ${images.length}.`,
          severity: 'error',
        });
      }

      if (videos.length > TwitterAdapter.MAX_VIDEO_COUNT) {
        results.push({
          field: 'media',
          message: `Maximum ${TwitterAdapter.MAX_VIDEO_COUNT} video allowed per tweet. Found ${videos.length}.`,
          severity: 'error',
        });
      }

      for (const img of images) {
        if (img.width && img.width > TwitterAdapter.MAX_IMAGE_WIDTH) {
          results.push({
            field: 'media',
            message: `Image "${img.name || 'unknown'}" exceeds recommended width of ${TwitterAdapter.MAX_IMAGE_WIDTH}px. It will be resized.`,
            severity: 'warning',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    const maxChars = options?.isPremium
      ? TwitterAdapter.MAX_CHARS_PREMIUM
      : TwitterAdapter.MAX_CHARS;

    let text = this.stripHtml(raw.text);

    const formattedMedia = raw.media?.map((m) => {
      const processed = { ...m };
      if (
        (m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))) &&
        m.width &&
        m.width > TwitterAdapter.MAX_IMAGE_WIDTH
      ) {
        const ratio = TwitterAdapter.MAX_IMAGE_WIDTH / m.width;
        processed.width = TwitterAdapter.MAX_IMAGE_WIDTH;
        processed.height = m.height ? Math.round(m.height * ratio) : undefined;
        processed.resized = true;
      }
      return processed;
    });

    if (text.length > maxChars) {
      const thread = this.splitIntoThread(text);
      const threadPosts: FormattedPost[] = thread.map((chunk, index) => ({
        content: chunk,
        media: index === 0 ? formattedMedia : undefined,
        settings: raw.settings,
      }));

      return {
        content: threadPosts[0].content,
        media: threadPosts[0].media,
        thread: threadPosts.slice(1),
        settings: raw.settings,
      };
    }

    return {
      content: text,
      media: formattedMedia,
      settings: raw.settings,
    };
  }

  splitIntoThread(content: string): string[] {
    const maxChars = TwitterAdapter.MAX_CHARS;
    if (content.length <= maxChars) {
      return [content];
    }

    const chunks: string[] = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (sentence.length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        const words = sentence.split(/\s+/);
        for (const word of words) {
          if ((currentChunk + ' ' + word).trim().length > maxChars) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = word;
          } else {
            currentChunk = currentChunk ? currentChunk + ' ' + word : word;
          }
        }
      } else if ((currentChunk + ' ' + sentence).trim().length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
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
