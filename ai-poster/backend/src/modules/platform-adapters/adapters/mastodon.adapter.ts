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
export class MastodonAdapter implements PlatformAdapterInterface {
  platform = 'mastodon';

  private static readonly MAX_CHARS = 500;
  private static readonly MAX_MEDIA_ATTACHMENTS = 4;
  private static readonly MAX_IMAGE_SIZE_BYTES = 16 * 1024 * 1024; // 16MB
  private static readonly MAX_VIDEO_SIZE_BYTES = 99 * 1024 * 1024; // 99MB

  getMaxChars(): number {
    return MastodonAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'visibility',
        label: 'Visibility',
        type: 'select',
        required: false,
        options: [
          { label: 'Public', value: 'public' },
          { label: 'Unlisted', value: 'unlisted' },
          { label: 'Followers Only', value: 'private' },
          { label: 'Direct Message', value: 'direct' },
        ],
        defaultValue: 'public',
      },
      {
        key: 'sensitive',
        label: 'Mark as Sensitive',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'spoilerText',
        label: 'Content Warning',
        type: 'text',
        required: false,
      },
      {
        key: 'language',
        label: 'Language',
        type: 'text',
        required: false,
        defaultValue: 'en',
      },
      {
        key: 'instance',
        label: 'Instance URL',
        type: 'text',
        required: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if ((!content || content.trim().length === 0) && (!media || media.length === 0)) {
      results.push({
        field: 'content',
        message: 'Mastodon toot must have text or media.',
        severity: 'error',
      });
    }

    if (content && content.length > MastodonAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${MastodonAdapter.MAX_CHARS} characters (${content.length}). Consider using a thread.`,
        severity: 'warning',
      });
    }

    if (media) {
      if (media.length > MastodonAdapter.MAX_MEDIA_ATTACHMENTS) {
        results.push({
          field: 'media',
          message: `Maximum ${MastodonAdapter.MAX_MEDIA_ATTACHMENTS} media attachments allowed. Found ${media.length}.`,
          severity: 'error',
        });
      }

      for (const item of media) {
        const isVideo = item.type === 'video' || item.mimeType?.startsWith('video');
        const maxSize = isVideo
          ? MastodonAdapter.MAX_VIDEO_SIZE_BYTES
          : MastodonAdapter.MAX_IMAGE_SIZE_BYTES;
        const maxSizeLabel = isVideo ? '99MB' : '16MB';

        if (item.size && item.size > maxSize) {
          results.push({
            field: 'media',
            message: `File "${item.name || 'unknown'}" exceeds ${maxSizeLabel} limit (${(item.size / (1024 * 1024)).toFixed(2)}MB).`,
            severity: 'error',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    const settings: Record<string, any> = { ...raw.settings };

    if (raw.media && raw.media.length > 0) {
      settings.multipartMedia = true;
    }

    if (text.length > MastodonAdapter.MAX_CHARS) {
      const thread = this.splitIntoThread(text);
      const threadPosts: FormattedPost[] = thread.map((chunk, index) => ({
        content: chunk,
        media: index === 0 ? raw.media : undefined,
        settings: index === 0 ? settings : { ...raw.settings, multipartMedia: false },
      }));

      return {
        content: threadPosts[0].content,
        media: threadPosts[0].media,
        thread: threadPosts.slice(1),
        settings: threadPosts[0].settings,
      };
    }

    return {
      content: text,
      media: raw.media,
      settings,
    };
  }

  splitIntoThread(content: string): string[] {
    const maxChars = MastodonAdapter.MAX_CHARS;
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
