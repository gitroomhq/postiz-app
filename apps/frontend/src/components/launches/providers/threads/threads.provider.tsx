import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/launches/finisher/thread.finisher';
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
