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
export class BlueskyAdapter implements PlatformAdapterInterface {
  platform = 'bluesky';

  private static readonly MAX_CHARS = 300;
  private static readonly MAX_IMAGES = 4;
  private static readonly MAX_IMAGE_SIZE_BYTES = 976 * 1024; // 976KB

  getMaxChars(): number {
    return BlueskyAdapter.MAX_CHARS;
  }

  getSettingsSchema(): SettingsField[] {
    return [
      {
        key: 'languages',
        label: 'Languages (comma-separated codes)',
        type: 'text',
        required: false,
        defaultValue: 'en',
      },
      {
        key: 'replyTo',
        label: 'Reply To URI',
        type: 'text',
        required: false,
      },
      {
        key: 'quoteTo',
        label: 'Quote Post URI',
        type: 'text',
        required: false,
      },
      {
        key: 'selfLabel',
        label: 'Content Label',
        type: 'select',
        required: false,
        options: [
          { label: 'None', value: '' },
          { label: 'Nudity', value: 'nudity' },
          { label: 'Sexual', value: 'sexual' },
          { label: 'Graphic Media', value: 'graphic-media' },
        ],
      },
    ];
  }

  validate(content: string, media?: any[]): ValidationResult[] {
    const results: ValidationResult[] = [];

    if ((!content || content.trim().length === 0) && (!media || media.length === 0)) {
      results.push({
        field: 'content',
        message: 'Bluesky post must have text or media.',
        severity: 'error',
      });
    }

    if (content && content.length > BlueskyAdapter.MAX_CHARS) {
      results.push({
        field: 'content',
        message: `Content exceeds ${BlueskyAdapter.MAX_CHARS} characters (${content.length}). Bluesky has the strictest character limit. Consider using a thread.`,
        severity: 'warning',
      });
    }

    if (media) {
      const images = media.filter(
        (m) => m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))
      );

      if (images.length > BlueskyAdapter.MAX_IMAGES) {
        results.push({
          field: 'media',
          message: `Maximum ${BlueskyAdapter.MAX_IMAGES} images allowed. Found ${images.length}.`,
          severity: 'error',
        });
      }

      for (const img of images) {
        if (img.size && img.size > BlueskyAdapter.MAX_IMAGE_SIZE_BYTES) {
          results.push({
            field: 'media',
            message: `Image "${img.name || 'unknown'}" exceeds 976KB limit (${(img.size / 1024).toFixed(0)}KB). Compression required.`,
            severity: 'error',
          });
        }
      }
    }

    return results;
  }

  formatContent(raw: RawContent, options?: AdapterOptions): FormattedPost {
    let text = this.stripHtml(raw.text);

    const facets = this.buildFacets(text);

    const settings: Record<string, any> = {
      ...raw.settings,
      facets,
    };

    if (settings.languages && typeof settings.languages === 'string') {
      settings.languages = settings.languages
        .split(',')
        .map((lang: string) => lang.trim())
        .filter((lang: string) => lang.length > 0);
    }

    const formattedMedia = raw.media?.map((m) => {
      const processed = { ...m };
      if (
        (m.type === 'image' || (!m.type && !m.mimeType?.startsWith('video'))) &&
        m.size &&
        m.size > BlueskyAdapter.MAX_IMAGE_SIZE_BYTES
      ) {
        processed.compressionRequired = true;
        processed.targetSizeBytes = BlueskyAdapter.MAX_IMAGE_SIZE_BYTES;
      }
      return processed;
    });

    if (text.length > BlueskyAdapter.MAX_CHARS) {
      const thread = this.splitIntoThread(text);
      const threadPosts: FormattedPost[] = thread.map((chunk, index) => {
        const chunkFacets = this.buildFacets(chunk);
        return {
          content: chunk,
          media: index === 0 ? formattedMedia : undefined,
          settings: {
            ...raw.settings,
            facets: chunkFacets,
            languages: settings.languages,
          },
        };
      });

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
    const maxChars = BlueskyAdapter.MAX_CHARS;
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

  private buildFacets(
    text: string
  ): { index: { byteStart: number; byteEnd: number }; features: any[] }[] {
    const facets: {
      index: { byteStart: number; byteEnd: number };
      features: any[];
    }[] = [];

    const encoder = new TextEncoder();

    const mentionRegex = /@([a-zA-Z0-9._-]+(\.[a-zA-Z0-9._-]+)*)/g;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
      const beforeMatch = text.substring(0, match.index);
      const byteStart = encoder.encode(beforeMatch).byteLength;
      const byteEnd = byteStart + encoder.encode(match[0]).byteLength;

      facets.push({
        index: { byteStart, byteEnd },
        features: [
          {
            $type: 'app.bsky.richtext.facet#mention',
            did: match[1],
          },
        ],
      });
    }

    const urlRegex =
      /https?:\/\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/g;

    while ((match = urlRegex.exec(text)) !== null) {
      const beforeMatch = text.substring(0, match.index);
      const byteStart = encoder.encode(beforeMatch).byteLength;
      const byteEnd = byteStart + encoder.encode(match[0]).byteLength;

      facets.push({
        index: { byteStart, byteEnd },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: match[0],
          },
        ],
      });
    }

    const tagRegex = /#([a-zA-Z0-9_]+)/g;

    while ((match = tagRegex.exec(text)) !== null) {
      const beforeMatch = text.substring(0, match.index);
      const byteStart = encoder.encode(beforeMatch).byteLength;
      const byteEnd = byteStart + encoder.encode(match[0]).byteLength;

      facets.push({
        index: { byteStart, byteEnd },
        features: [
          {
            $type: 'app.bsky.richtext.facet#tag',
            tag: match[1],
          },
        ],
      });
    }

    return facets;
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
