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
export class DribbbleAdapter implements PlatformAdapterInterface {
  platform = 'dribbble';

  private static readonly MAX_CHARS = 40000;
  private static readonly MAX_TITLE_CHARS = 100;
  private static readonly RECOMMENDED_WIDTH = 1600;
  private static readonly RECOMMENDED_HEIGHT = 1200;

  getMaxChars(): number {
    return DribbbleAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'tags',
        label: 'Tags (comma-separated)',
        type: 'text',
        required: false,
      },
      {
        key: 'lowProfile',
        label: 'Low Profile',
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
        message: 'Dribbble shots require an image.',
        severity: 'error',
      });
    }

    if (media && media.length > 1) {
      results.push({
        field: 'media',
        message: 'Dribbble allows only a single image per shot.',
        severity: 'error',
      });
    }

    if (media && media.length === 1) {
      const item = media[0];
      if (item.type === 'video' || item.mimeType?.startsWith('video')) {
        results.push({
          field: 'media',
          message: 'Dribbble shots require an image, not a video.',
          severity: 'error',
        });
      }
    }

    if (content && content.length > DribbbleAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Description exceeds ${DribbbleAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    let title = raw.title || '';

    if (!title) {
      const firstLine = text.split('\n')[0];
      title = firstLine.substring(0, DribbbleAdapter.MAX_TITLE_CHARS);
    }

    if (title.length > DribbbleAdapter.MAX_TITLE_CHARS) {
      title = title.substring(0, DribbbleAdapter.MAX_TITLE_CHARS - 3) + '...';
    }

    if (text.length > DribbbleAdapter.MAX_CHARS) {
      text = text.substring(0, DribbbleAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (settings.tags && typeof settings.tags === 'string') {
      settings.tags = settings.tags
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0);
    }

    const formattedMedia = raw.media?.map((m) => {
      const processed = { ...m };
      if (m.width && m.height) {
        if (
          m.width < DribbbleAdapter.RECOMMENDED_WIDTH ||
          m.height < DribbbleAdapter.RECOMMENDED_HEIGHT
        ) {
          processed.resizeRecommended = true;
          processed.recommendedWidth = DribbbleAdapter.RECOMMENDED_WIDTH;
          processed.recommendedHeight = DribbbleAdapter.RECOMMENDED_HEIGHT;
        }
      }
      return processed;
    });

    return {
      content: text,
      title,
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
