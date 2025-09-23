import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(
  null, // GBP does not need additional transform logic for media
  undefined, // No custom setting form rendering
  undefined, // No additional integration save logic

  // Validation function for post content/media
  async (posts) => {
    if (posts.some((p) => p.length > 1)) {
      return 'GBP supports only one image or video per post.';
    }

    for (const media of posts.flatMap((p) => p)) {
      if (media.path.endsWith('.mp4')) {
        const isValid = await checkVideoDuration(media.path);
        if (!isValid) {
          return 'Video duration must be less than or equal to 30 seconds for GBP.';
        }
      }
    }

    return true;
  },

  // Character limit for GBP posts - 1500 characters
  () => 1500
);

// Utility: Check duration of video before posting
const checkVideoDuration = async (url: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve(video.duration <= 30); // GBP allows short videos
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata.'));
    };
  });
};
