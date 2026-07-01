export const PIXELFED_DEFAULT_LIMITS = {
  maxCharacters: 500,
  maxMediaAttachments: 4,
  maxAltTextCharacters: 1_000,
  imageSizeLimit: 15_000 * 1_024,
  supportedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
} as const;

export type PixelfedLimits = {
  maxCharacters: number;
  maxMediaAttachments: number;
  maxAltTextCharacters: number;
  imageSizeLimit: number;
  supportedMimeTypes: string[];
};

type PixelfedInstanceResponse = {
  configuration?: {
    media_attachments?: {
      image_size_limit?: number;
      supported_mime_types?: string[];
    };
    statuses?: {
      max_characters?: number;
      max_media_attachments?: number;
    };
  };
  max_toot_chars?: number;
};

type PixelfedPost = {
  message: string;
  media?: Array<{
    alt?: string;
    type: 'image' | 'video';
  }>;
};

function positiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0
    ? Number(value)
    : fallback;
}

export function parsePixelfedLimits(value: unknown): PixelfedLimits {
  const instance = value as PixelfedInstanceResponse | undefined;
  const media = instance?.configuration?.media_attachments;
  const statuses = instance?.configuration?.statuses;

  return {
    maxCharacters: positiveInteger(
      statuses?.max_characters ?? instance?.max_toot_chars,
      PIXELFED_DEFAULT_LIMITS.maxCharacters
    ),
    maxMediaAttachments: positiveInteger(
      statuses?.max_media_attachments,
      PIXELFED_DEFAULT_LIMITS.maxMediaAttachments
    ),
    maxAltTextCharacters: PIXELFED_DEFAULT_LIMITS.maxAltTextCharacters,
    imageSizeLimit: positiveInteger(
      media?.image_size_limit,
      PIXELFED_DEFAULT_LIMITS.imageSizeLimit
    ),
    supportedMimeTypes: media?.supported_mime_types?.filter(
      (mime): mime is string => typeof mime === 'string' && !!mime
    ) || [...PIXELFED_DEFAULT_LIMITS.supportedMimeTypes],
  };
}

export function validatePixelfedPost(
  post: PixelfedPost | undefined,
  limits: PixelfedLimits,
  requireMedia: boolean
): string | true {
  const media = post?.media || [];
  if (requireMedia && media.length === 0) {
    return 'Pixelfed requires at least one media attachment.';
  }
  if (media.length > limits.maxMediaAttachments) {
    return `This Pixelfed instance supports up to ${limits.maxMediaAttachments} media attachments.`;
  }
  if ((post?.message || '').length > limits.maxCharacters) {
    return `This Pixelfed instance supports up to ${limits.maxCharacters} caption characters.`;
  }

  const allowsVideo = limits.supportedMimeTypes.some((mime) =>
    mime.startsWith('video/')
  );
  if (!allowsVideo && media.some((item) => item.type === 'video')) {
    return 'This Pixelfed instance does not support video attachments.';
  }
  if (
    media.some((item) => (item.alt || '').length > limits.maxAltTextCharacters)
  ) {
    return `Pixelfed alt text is limited to ${limits.maxAltTextCharacters} characters.`;
  }

  return true;
}
