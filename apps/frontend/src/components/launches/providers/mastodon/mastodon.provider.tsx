import { FC } from 'react';
import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';

const Empty: FC = (props) => {
  return null;
};

export default withProvider(null, Empty, undefined, undefined);
