import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
export default withProvider(null, undefined, undefined, async (posts) => {
  if (posts.some(p => p.length > 4)) {
    return 'There can be maximum 4 pictures in a post.';
  }

  if (posts.some(p => p.some(m => m.path.indexOf('mp4') > -1) && p.length > 1)) {
    return 'There can be maximum 1 video in a post.';
  }
  return true;
}, 280);
