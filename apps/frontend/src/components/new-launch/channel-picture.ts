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
  return trimmed.length > 0 && trimmed !== '/no-picture.jpg';
}
