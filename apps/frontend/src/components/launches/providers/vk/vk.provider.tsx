import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

export default withProvider(
  null,
  undefined,
  undefined,
  async (posts) => {
    return true;
  },
  2048
);
