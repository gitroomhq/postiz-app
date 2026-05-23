export const hasExtension = (
  path: string | undefined | null,
  extension: string
): boolean => {
  if (!path) {
    return false;
  }
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return path.toLowerCase().indexOf(ext.toLowerCase()) > -1;
};

const ALLOWED_POST_MEDIA: ReadonlyArray<{ ext: string; mime: string }> = [
  { ext: 'png', mime: 'image/png' },
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'mp4', mime: 'video/mp4' },
];

export const VALID_POST_MEDIA_EXTENSIONS = ALLOWED_POST_MEDIA.map(
  (m) => m.ext
);

export const VALID_POST_MEDIA_MIME_TYPES = new Set<string>(
  ALLOWED_POST_MEDIA.map((m) => m.mime)
);

export const isValidPostMediaUrl = (
  path: string | undefined | null
): boolean => {
  return VALID_POST_MEDIA_EXTENSIONS.some((ext) => hasExtension(path, ext));
};
