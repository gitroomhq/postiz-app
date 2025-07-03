// ----------------------------------------------------------------------------------------------------
// website.provider.ts

import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(
  null, // No transform logic needed for Website
  undefined, // No custom settings form
  undefined, // No extra save logic

  // Optional: Content/media validation for Website
  async (posts) => {
    // Example: Allow multiple images/videos, but maybe limit total count?
    const totalMediaCount = posts.flat().length;

    if (totalMediaCount > 10) {
      return 'Website posts cannot have more than 10 media items.';
    }

    // Example: Validate video length if you want
    for (const media of posts.flat()) {
      if (media.path.endsWith('.mp4')) {
        const isValid = await checkVideoDuration(media.path);
        if (!isValid) {
          return 'Each video must be 2 minutes or less for Website posts.';
        }
      }
    }

    return true;
  },

  // Optional delay
  () => 300
);

// Utility: Check duration of video
const checkVideoDuration = async (url: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve(video.duration <= 120); // Example: 2 minutes max
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata.'));
    };
  });
};
