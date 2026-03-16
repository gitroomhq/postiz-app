import { MediaCapabilities } from '@gitroom/frontend/components/launches/calendar.context';

export function validateMediaFromCapabilities(
  posts: Array<Array<{ path: string; thumbnail?: string }>>,
  capabilities: MediaCapabilities
): string | true {
  for (const media of posts) {
    if (!media || media.length === 0) {
      if (capabilities.requiresMedia) {
        return 'At least one media attachment is required';
      }
      if (capabilities.requiresVideo) {
        return 'At least one video is required';
      }
      continue;
    }

    const images = media.filter((m) => !m.thumbnail);
    const videos = media.filter((m) => !!m.thumbnail);

    if (capabilities.requiresVideo && videos.length === 0) {
      return 'At least one video is required';
    }

    if (images.length > capabilities.maxImages) {
      return `Maximum ${capabilities.maxImages} images allowed`;
    }

    if (videos.length > capabilities.maxVideos) {
      return `Maximum ${capabilities.maxVideos} videos allowed`;
    }

    if (
      !capabilities.canMixMediaTypes &&
      images.length > 0 &&
      videos.length > 0
    ) {
      return 'Images and videos cannot be mixed in the same post';
    }
  }

  return true;
}
