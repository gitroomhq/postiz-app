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
export class YouTubeAdapter implements PlatformAdapterInterface {
  platform = 'youtube';

  private static readonly MAX_TITLE_CHARS = 100;
  private static readonly MAX_DESCRIPTION_CHARS = 5000;
  private static readonly MAX_TAGS = 500;
  private static readonly MAX_TAG_CHARS = 30;

  getMaxChars(): number {
    return YouTubeAdapter.MAX_DESCRIPTION_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'privacy',
        label: 'Privacy Status',
        type: 'select',
        required: true,
        options: [
          { label: 'Public', value: 'public' },
          { label: 'Unlisted', value: 'unlisted' },
          { label: 'Private', value: 'private' },
        ],
        defaultValue: 'private',
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        required: false,
        options: [
          { label: 'Film & Animation', value: '1' },
          { label: 'Autos & Vehicles', value: '2' },
          { label: 'Music', value: '10' },
          { label: 'Pets & Animals', value: '15' },
          { label: 'Sports', value: '17' },
          { label: 'Travel & Events', value: '19' },
          { label: 'Gaming', value: '20' },
          { label: 'People & Blogs', value: '22' },
          { label: 'Comedy', value: '23' },
          { label: 'Entertainment', value: '24' },
          { label: 'News & Politics', value: '25' },
          { label: 'Howto & Style', value: '26' },
          { label: 'Education', value: '27' },
          { label: 'Science & Technology', value: '28' },
          { label: 'Nonprofits & Activism', value: '29' },
        ],
        defaultValue: '22',
      },
      {
        key: 'tags',
        label: 'Tags (comma-separated)',
        type: 'text',
        required: false,
      },
      {
        key: 'madeForKids',
        label: 'Made for Kids',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'embeddable',
        label: 'Allow Embedding',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'notifySubscribers',
        label: 'Notify Subscribers',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'defaultLanguage',
        label: 'Default Language',
        type: 'text',
        required: false,
        defaultValue: 'en',
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!media || media.length === 0) {
      results.push({
        field: 'media',
        message: 'YouTube requires a video file.',
        severity: 'error',
      });
    }

    if (media && media.length > 0) {
      const videos = media.filter(
        (m) => m.type === 'video' || m.mimeType?.startsWith('video')
      );
      if (videos.length === 0) {
        results.push({
          field: 'media',
          message: 'YouTube requires a video file. Only image files were provided.',
          severity: 'error',
        });
      }
      if (videos.length > 1) {
        results.push({
          field: 'media',
          message: 'Only one video can be uploaded at a time.',
          severity: 'error',
        });
      }
    }

    if (content && content.length > YouTubeAdapter.MAX_DESCRIPTION_CHARS) {
      results.push({
        field: 'content',
        message: `Description exceeds ${YouTubeAdapter.MAX_DESCRIPTION_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let description = this.stripHtml(raw.text);
    let title = raw.title || '';

    if (!title && description) {
      const firstLine = description.split('\n')[0];
      title = firstLine.substring(0, YouTubeAdapter.MAX_TITLE_CHARS);
    }

    if (title.length > YouTubeAdapter.MAX_TITLE_CHARS) {
      title = title.substring(0, YouTubeAdapter.MAX_TITLE_CHARS - 3) + '...';
    }

    if (description.length > YouTubeAdapter.MAX_DESCRIPTION_CHARS) {
      description =
        description.substring(0, YouTubeAdapter.MAX_DESCRIPTION_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (settings.tags && typeof settings.tags === 'string') {
      settings.tags = settings.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0 && tag.length <= YouTubeAdapter.MAX_TAG_CHARS)
        .slice(0, YouTubeAdapter.MAX_TAGS);
    }

    return {
      content: description,
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
