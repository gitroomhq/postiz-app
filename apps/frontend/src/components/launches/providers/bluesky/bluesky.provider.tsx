import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

const Empty: FC = (props) => {
  return null;
};

export default withProvider(null, Empty, undefined, async (posts) => {
  if (posts.some((p) => p.length > 4)) {
    return 'There can be maximum 4 pictures in a post.';
  }

  return true;
});
