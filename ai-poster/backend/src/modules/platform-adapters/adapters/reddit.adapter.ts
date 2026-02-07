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
export class RedditAdapter implements PlatformAdapterInterface {
  platform = 'reddit';

  private static readonly MAX_CHARS = 10000;
  private static readonly MAX_TITLE_CHARS = 300;

  getMaxChars(): number {
    return RedditAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'subreddit',
        label: 'Subreddit',
        type: 'text',
        required: true,
      },
      {
        key: 'postType',
        label: 'Post Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Text', value: 'text' },
          { label: 'Link', value: 'link' },
          { label: 'Image', value: 'image' },
          { label: 'Video', value: 'video' },
        ],
        defaultValue: 'text',
      },
      {
        key: 'flair',
        label: 'Flair',
        type: 'text',
        required: false,
      },
      {
        key: 'nsfw',
        label: 'NSFW',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'spoiler',
        label: 'Spoiler',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'linkUrl',
        label: 'Link URL',
        type: 'text',
        required: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!content || content.trim().length === 0) {
      results.push({
        field: 'title',
        message: 'Reddit posts require a title.',
        severity: 'error',
      });
    }

    if (content && content.length > RedditAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${RedditAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    let title = raw.title || '';

    if (!title && text) {
      const firstLine = text.split('\n')[0];
      title = firstLine.substring(0, RedditAdapter.MAX_TITLE_CHARS);
      const remainingLines = text.split('\n').slice(1).join('\n').trim();
      if (remainingLines) {
        text = remainingLines;
      }
    }

    if (title.length > RedditAdapter.MAX_TITLE_CHARS) {
      title = title.substring(0, RedditAdapter.MAX_TITLE_CHARS - 3) + '...';
    }

    if (text.length > RedditAdapter.MAX_CHARS) {
      text = text.substring(0, RedditAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (settings.subreddit && !settings.subreddit.startsWith('r/')) {
      settings.subreddit = `r/${settings.subreddit}`;
    }

    if (raw.media && raw.media.length > 0) {
      const hasVideo = raw.media.some(
        (m) => m.type === 'video' || m.mimeType?.startsWith('video')
      );
      if (hasVideo) {
        settings.postType = settings.postType || 'video';
      } else {
        settings.postType = settings.postType || 'image';
      }
    } else if (settings.linkUrl) {
      settings.postType = settings.postType || 'link';
    } else {
      settings.postType = settings.postType || 'text';
    }

    return {
      content: text,
      title,
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
