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
export class PinterestAdapter implements PlatformAdapterInterface {
  platform = 'pinterest';

  private static readonly MAX_CHARS = 500;
  private static readonly MAX_TITLE_CHARS = 100;
  private static readonly RECOMMENDED_ASPECT_RATIO = 2 / 3; // 1000x1500

  getMaxChars(): number {
    return PinterestAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'board',
        label: 'Board',
        type: 'text',
        required: true,
      },
      {
        key: 'section',
        label: 'Board Section',
        type: 'text',
        required: false,
      },
      {
        key: 'linkUrl',
        label: 'Destination Link',
        type: 'text',
        required: false,
      },
      {
        key: 'altText',
        label: 'Alt Text',
        type: 'text',
        required: false,
      },
      {
        key: 'dominantColor',
        label: 'Dominant Color (hex)',
        type: 'text',
        required: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!media || media.length === 0) {
      results.push({
        field: 'media',
        message: 'Pinterest pins require at least one image or video.',
        severity: 'error',
      });
    }

    if (content && content.length > PinterestAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Description exceeds ${PinterestAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media) {
      const videos = media.filter(
        (m) => m.type === 'video' || m.mimeType?.startsWith('video')
      );
      if (videos.length > 0) {
        const images = media.filter(
          (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
        );
        if (images.length === 0) {
          results.push({
            field: 'media',
            message: 'Video pins require a cover image.',
            severity: 'warning',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    let title = raw.title || '';

    if (!title && text) {
      const firstSentence = text.match(/^[^.!?]+[.!?]?/);
      title = firstSentence
        ? firstSentence[0].substring(0, PinterestAdapter.MAX_TITLE_CHARS)
        : text.substring(0, PinterestAdapter.MAX_TITLE_CHARS);
    }

    if (title.length > PinterestAdapter.MAX_TITLE_CHARS) {
      title = title.substring(0, PinterestAdapter.MAX_TITLE_CHARS - 3) + '...';
    }

    if (text.length > PinterestAdapter.MAX_CHARS) {
      text = text.substring(0, PinterestAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (raw.media && raw.media.length > 0) {
      const videos = raw.media.filter(
        (m) => m.type === 'video' || m.mimeType?.startsWith('video')
      );
      if (videos.length > 0) {
        const coverImage = raw.media.find(
          (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
        );
        if (coverImage) {
          settings.coverImage = coverImage;
        }
      }
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
