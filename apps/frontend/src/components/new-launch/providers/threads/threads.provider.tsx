'use client';

import { withProvider } from '@chaolaolo/frontend/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@chaolaolo/frontend/components/new-launch/finisher/thread.finisher';
const SettingsComponent = () => {
  return <ThreadFinisher />;
};

export default withProvider(
  SettingsComponent,
  undefined,
  undefined,
  async () => {
    return true;
  },
  500
);
