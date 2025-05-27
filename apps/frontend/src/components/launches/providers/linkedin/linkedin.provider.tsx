import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(null, undefined, undefined, async (posts) => {
  const [firstPost, ...restPosts] = posts;
  if (firstPost.length > 1 && firstPost.some((p) => p.path.indexOf('mp4') > -1)) {
    return 'LinkedIn can have maximum 1 media when selecting a video.';
  }

  if (restPosts.some((p) => p.length > 0)) {
    return 'LinkedIn comments can only contain text.';
  }

  return true;
}, 3000);
