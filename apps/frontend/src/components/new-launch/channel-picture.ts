export function channelPlatformIcon(identifier: string): string {
  return identifier === 'youtube'
    ? '/icons/platforms/youtube.svg'
    : `/icons/platforms/${identifier}.png`;
}

export function isUsableChannelPicture(
  picture?: string | null
): picture is string {
  if (!picture) {
    return false;
  }
  const trimmed = picture.trim();
  if (!trimmed) return false;
  // Backend still serializes the placeholder as `/no-picture.jpg` or a CDN URL
  // that ends with it — both render as the gray silhouette the composer chips
  // used to show.
  return !/no-picture\.jpg(?:\?|$)/i.test(trimmed);
}
