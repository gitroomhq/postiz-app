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
export class LinkedInAdapter implements PlatformAdapterInterface {
  platform = 'linkedin';

  private static readonly MAX_CHARS = 3000;
  private static readonly MAX_IMAGES = 20;
  private static readonly CAROUSEL_THRESHOLD = 2;

  getMaxChars(): number {
    return LinkedInAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'visibility',
        label: 'Visibility',
        type: 'select',
        required: false,
        options: [
          { label: 'Public', value: 'PUBLIC' },
          { label: 'Connections Only', value: 'CONNECTIONS' },
        ],
        defaultValue: 'PUBLIC',
      },
      {
        key: 'shareAsArticle',
        label: 'Share as Article',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'firstComment',
        label: 'First Comment',
        type: 'text',
        required: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!content || content.trim().length === 0) {
      results.push({
        field: 'content',
        message: 'LinkedIn post must have text content.',
        severity: 'error',
      });
    }

    if (content && content.length > LinkedInAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${LinkedInAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media && media.length > LinkedInAdapter.MAX_IMAGES) {
      results.push({
        field: 'media',
        message: `Maximum ${LinkedInAdapter.MAX_IMAGES} images allowed. Found ${media.length}.`,
        severity: 'error',
      });
    }

    if (content && content.length > 1300) {
      results.push({
        field: 'content',
        message:
          'Content exceeds 1300 characters. LinkedIn truncates posts after ~1300 characters with a "See more" link.',
        severity: 'warning',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    text = this.escapeSpecialChars(text);
    text = this.formatMentions(text);

    if (text.length > LinkedInAdapter.MAX_CHARS) {
      text = text.substring(0, LinkedInAdapter.MAX_CHARS - 3) + '...';
    }

    let formattedMedia = raw.media ? [...raw.media] : undefined;
    const settings: Record<string, any> = { ...raw.settings };

    if (
      formattedMedia &&
      formattedMedia.length >= LinkedInAdapter.CAROUSEL_THRESHOLD
    ) {
      const images = formattedMedia.filter(
        (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
      );
      if (images.length >= LinkedInAdapter.CAROUSEL_THRESHOLD) {
        settings.mediaType = 'CAROUSEL';
      }
    }

    return {
      content: text,
      title: raw.title,
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

  private escapeSpecialChars(text: string): string {
    return text
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]');
  }

  private formatMentions(text: string): string {
    return text.replace(
      /@(\w+)/g,
      (match, username) => `@${username}`
    );
  }
}
