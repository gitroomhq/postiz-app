'use client';

import { PostComment, withProvider } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider(
  PostComment.POST,
  null,
  undefined,
  undefined,
  async (posts) => {
    return true;
  },
  2048
);
