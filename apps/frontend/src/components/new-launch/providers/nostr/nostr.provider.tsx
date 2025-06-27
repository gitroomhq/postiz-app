'use client';

import { withProvider } from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider(
  null,
  undefined,
  undefined,
  async () => {
    return true;
  },
  100000
);
