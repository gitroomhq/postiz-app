'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { ThreadFinisher } from '@gitroom/frontend/components/new-launch/finisher/thread.finisher';

const SettingsComponent = () => {
  return <ThreadFinisher />;
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: SettingsComponent,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: async (posts) => {
    if (
      posts.some(
        (p) => p.some((a) => a.path.indexOf('mp4') > -1) && p.length > 1
      )
    ) {
      return 'You can only upload one video per post.';
    }

    if (posts.some((p) => p.length > 4)) {
      return 'There can be maximum 4 pictures in a post.';
    }
    return true;
  },
  maximumCharacters: 300,
});
