'use client';

import { PostComment, withProvider } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider(
  PostComment.COMMENT,
  null,
  undefined,
  undefined,
  async () => {
    return true;
  },
  4096
);
