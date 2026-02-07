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
export class ThreadsAdapter implements PlatformAdapterInterface {
  platform = 'threads';

  private static readonly MAX_CHARS = 500;
  private static readonly MAX_IMAGES = 10;
  private static readonly CAROUSEL_THRESHOLD = 2;

  getMaxChars(): number {
    return ThreadsAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'replyControl',
        label: 'Reply Control',
        type: 'select',
        required: false,
        options: [
          { label: 'Everyone', value: 'everyone' },
          { label: 'Profiles You Follow', value: 'accounts_you_follow' },
          { label: 'Mentioned Only', value: 'mentioned_only' },
        ],
        defaultValue: 'everyone',
      },
      {
        key: 'allowQuoting',
        label: 'Allow Quoting',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if ((!content || content.trim().length === 0) && (!media || media.length === 0)) {
      results.push({
        field: 'content',
        message: 'Threads post must have text or media.',
        severity: 'error',
      });
    }

    if (content && content.length > ThreadsAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${ThreadsAdapter.MAX_CHARS} characters (${content.length}). Consider using a thread.`,
        severity: 'warning',
      });
    }

    if (media && media.length > ThreadsAdapter.MAX_IMAGES) {
      results.push({
        field: 'media',
        message: `Maximum ${ThreadsAdapter.MAX_IMAGES} media items allowed. Found ${media.length}.`,
        severity: 'error',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    const formattedMedia = raw.media ? [...raw.media] : undefined;
    const settings: Record<string, any> = { ...raw.settings };

    if (
      formattedMedia &&
      formattedMedia.length >= ThreadsAdapter.CAROUSEL_THRESHOLD
    ) {
      const images = formattedMedia.filter(
        (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
      );
      if (images.length >= ThreadsAdapter.CAROUSEL_THRESHOLD) {
        settings.mediaType = 'CAROUSEL';
      }
    }

    if (text.length > ThreadsAdapter.MAX_CHARS) {
      const thread = this.splitIntoThread(text);
      const threadPosts: FormattedPost[] = thread.map((chunk, index) => ({
        content: chunk,
        media: index === 0 ? formattedMedia : undefined,
        settings: index === 0 ? settings : raw.settings,
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
      media: formattedMedia,
      settings,
    };
  }

  splitIntoThread(content: string): string[] {
    const maxChars = ThreadsAdapter.MAX_CHARS;
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
