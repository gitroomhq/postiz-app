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
  checkValidity: async ([firstPost, ...otherPosts], settings) => {
    const checkVideosLength = await Promise.all(
      firstPost
        .filter((f) => f.path.indexOf('mp4') > -1)
        .flatMap((p) => p.path)
        .map((p) => {
          return new Promise<number>((res) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = p;
            video.addEventListener('loadedmetadata', () => {
              res(video.duration);
            });
          });
        })
    );

    for (const video of checkVideosLength) {
      if (video > 300) {
        return 'Video should be maximum 300 seconds (5 minutes)';
      }
    }

    return true;
  },
  maximumCharacters: 500,
});
