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
export class DiscordAdapter implements PlatformAdapterInterface {
  platform = 'discord';

  private static readonly MAX_CHARS = 1980;
  private static readonly MAX_EMBED_DESCRIPTION = 4096;
  private static readonly MAX_EMBED_TITLE = 256;
  private static readonly MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (default)

  getMaxChars(): number {
    return DiscordAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'channel',
        label: 'Channel',
        type: 'text',
        required: true,
      },
      {
        key: 'serverId',
        label: 'Server ID',
        type: 'text',
        required: true,
      },
      {
        key: 'useEmbed',
        label: 'Use Rich Embed',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'embedColor',
        label: 'Embed Color (hex)',
        type: 'text',
        required: false,
        defaultValue: '#5865F2',
      },
      {
        key: 'tts',
        label: 'Text-to-Speech',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if ((!content || content.trim().length === 0) && (!media || media.length === 0)) {
      results.push({
        field: 'content',
        message: 'Discord message must have text or media.',
        severity: 'error',
      });
    }

    if (content && content.length > DiscordAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${DiscordAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media) {
      for (const item of media) {
        if (item.size && item.size > DiscordAdapter.MAX_FILE_SIZE_BYTES) {
          results.push({
            field: 'media',
            message: `File "${item.name || 'unknown'}" exceeds 25MB limit (${(item.size / (1024 * 1024)).toFixed(2)}MB).`,
            severity: 'error',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    text = this.convertToMarkdown(text);

    if (text.length > DiscordAdapter.MAX_CHARS) {
      text = text.substring(0, DiscordAdapter.MAX_CHARS - 3) + '...';
    }

    const settings: Record<string, any> = { ...raw.settings };

    if (settings.useEmbed) {
      settings.embed = {
        title: raw.title
          ? raw.title.substring(0, DiscordAdapter.MAX_EMBED_TITLE)
          : undefined,
        description: text.substring(0, DiscordAdapter.MAX_EMBED_DESCRIPTION),
        color: settings.embedColor
          ? parseInt(settings.embedColor.replace('#', ''), 16)
          : 0x5865f2,
      };
    }

    return {
      content: text,
      title: raw.title,
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

  private convertToMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      .replace(/__(.*?)__/g, '__$1__')
      .replace(/~~(.*?)~~/g, '~~$1~~');
  }
}
