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
export class SlackAdapter implements PlatformAdapterInterface {
  platform = 'slack';

  private static readonly MAX_CHARS = 40000;
  private static readonly MAX_ATTACHMENTS = 20;
  private static readonly MAX_BLOCKS = 50;

  getMaxChars(): number {
    return SlackAdapter.MAX_CHARS;
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
        key: 'workspace',
        label: 'Workspace',
        type: 'text',
        required: true,
      },
      {
        key: 'threadTs',
        label: 'Thread Timestamp (reply to)',
        type: 'text',
        required: false,
      },
      {
        key: 'unfurlLinks',
        label: 'Unfurl Links',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'unfurlMedia',
        label: 'Unfurl Media',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        key: 'asUser',
        label: 'Post as User',
        type: 'boolean',
        required: false,
        defaultValue: false,
      },
      {
        key: 'username',
        label: 'Bot Username',
        type: 'text',
        required: false,
      },
      {
        key: 'iconEmoji',
        label: 'Bot Icon Emoji',
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
        message: 'Slack message must have text content.',
        severity: 'error',
      });
    }

    if (content && content.length > SlackAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${SlackAdapter.MAX_CHARS} characters (${content.length}).`,
        severity: 'error',
      });
    }

    if (media && media.length > SlackAdapter.MAX_ATTACHMENTS) {
      results.push({
        field: 'media',
        message: `Maximum ${SlackAdapter.MAX_ATTACHMENTS} attachments allowed. Found ${media.length}.`,
        severity: 'error',
      });
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);
    text = this.convertToMrkdwn(text);

    if (text.length > SlackAdapter.MAX_CHARS) {
      text = text.substring(0, SlackAdapter.MAX_CHARS - 3) + '...';
    }

    return {
      content: text,
      title: raw.title,
      media: raw.media,
      settings: raw.settings,
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

  private convertToMrkdwn(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*')
      .replace(/__(.*?)__/g, '*$1*')
      .replace(/\*(.*?)\*/g, '_$1_')
      .replace(/~~(.*?)~~/g, '~$1~')
      .replace(/`{3}(\w*)\n([\s\S]*?)`{3}/g, '```$2```')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<$2|$1>');
  }
}
