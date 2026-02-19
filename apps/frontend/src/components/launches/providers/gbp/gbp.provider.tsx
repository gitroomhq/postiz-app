import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(
  null,
  undefined,
  undefined,

  // Validation function for post content/media
  async (posts) => {
    if (posts.some((p) => p.length > 1)) {
      return 'GBP supports only one image per post. Videos are not supported by the Google Business Profile API.';
    }

    for (const media of posts.flatMap((p) => p)) {
      if (media.path.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)$/i)) {
        return 'Videos are not supported by Google Business Profile. Please use images only.';
      }
    }

    return true;
  },

  () => 1500
);
