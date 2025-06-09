import { withProvider } from '@gitroom/frontend/components/launches/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/launches/finisher/thread.finisher';

const SettingsComponent = () => {
  return <ThreadFinisher />;
};

export default withProvider(
  SettingsComponent,
  undefined,
  undefined,
  async (posts) => {
    if (posts.some((p) => p.some((a) => a.path.indexOf('mp4') > -1))) {
      return 'At the moment BlueSky does not support video posts.';
    }
    if (posts.some((p) => p.length > 4)) {
      return 'There can be maximum 4 pictures in a post.';
    }
    return true;
  },
  300
);
