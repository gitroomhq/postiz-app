import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(
  null,
  undefined,
  undefined,
  async ([firstPost, ...otherPosts]) => {
    if (!firstPost.length) {
      return 'Instagram should have at least one media';
    }

    return true;
  },
  2200
);
