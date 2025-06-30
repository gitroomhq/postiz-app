'use client';

import { PostComment, withProvider } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider(
  PostComment.POST,
  null,
  undefined,
  undefined,
  async () => {
    return true;
  },
  100000
);
