import type { IntegrationListItem } from '@/src/api/integrations.api';
import type {
  CreatePostEntry,
  CreatePostType,
  PostValidationResult,
} from '@/src/api/posts.api';
import type { ComposerMedia } from '@/src/stores/composer.store';
import { sanitizeProviderSettings } from '@/src/services/provider-settings.service';

export function defaultProviderSettings(identifier: string): Record<string, unknown> {
  if (identifier === 'x') {
    return { __type: 'x', who_can_reply_post: 'everyone' };
  }

  return { __type: identifier };
}

export function buildPostEntries(params: {
  content: string;
  channelOverrides: Record<string, string>;
  channelSettings: Record<string, Record<string, unknown>>;
  integrations: IntegrationListItem[];
  media: ComposerMedia[];
  group: string;
}): CreatePostEntry[] {
  const image = params.media
    .filter((item) => item.status === 'uploaded' && item.serverId && item.path)
    .map((item) => ({
      id: item.serverId as string,
      path: item.path as string,
      ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
    }));

  return params.integrations.map((integration) => ({
    integration: { id: integration.id },
    group: params.group,
    settings: sanitizeProviderSettings(
      integration.identifier,
      params.channelSettings[integration.id] ?? defaultProviderSettings(integration.identifier)
    ),
    value: [
      {
        content: params.channelOverrides[integration.id]?.trim() || params.content,
        delay: 0,
        image,
      },
    ],
  }));
}

export function toBackendDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 19);
}

export function firstValidationError(
  items: PostValidationResult[],
  type: CreatePostType
) {
  for (const item of items) {
    if (item.emptyContent) {
      return `${item.name}: the post needs text or media.`;
    }

    if (type !== 'draft') {
      if (!item.valid) {
        return `${item.name}: ${
          item.settingsError ||
          'channel settings need attention. Configure this channel on the web app.'
        }`;
      }

      if (item.errors !== true) {
        return `${item.name}: ${item.errors}`;
      }

      if (item.tooLong) {
        return `${item.name}: the post is too long${
          item.maximumCharacters ? ` (max ${item.maximumCharacters} characters)` : ''
        }.`;
      }
    }
  }

  return null;
}

export function hashPayload(payload: unknown) {
  const raw = JSON.stringify(payload);
  let hash = 5381;

  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(index)) | 0;
  }

  return String(hash);
}
