import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
export default withProvider(
  null,
  undefined,
  undefined,
  async (posts) => {
    if (posts.some((p) => p.length > 4)) {
      return 'There can be maximum 4 pictures in a post.';
    }

    if (
      posts.some(
        (p) => p.some((m) => m.path.indexOf('mp4') > -1) && p.length > 1
      )
    ) {
      return 'There can be maximum 1 video in a post.';
    }

    for (const load of posts.flatMap((p) => p.flatMap((a) => a.path))) {
      if (load.indexOf('mp4') > -1) {
        const isValid = await checkVideoDuration(load);
        if (!isValid) {
          return 'Video duration must be less than or equal to 140 seconds.';
        }
      }
    }
    return true;
  },
  (settings) => {
    if (settings?.[0]?.value) {
      return 4000;
    }
    return 280;
  }
);

const checkVideoDuration = async (url: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      // Check if the duration is less than or equal to 140 seconds
      const duration = video.duration;
      if (duration <= 140) {
        resolve(true); // Video duration is acceptable
      } else {
        resolve(false); // Video duration exceeds 140 seconds
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata.'));
    };
  });
};
