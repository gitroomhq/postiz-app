'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';

export default withProvider({
  postComment: PostComment.COMMENT,
  comments: 'no-media',
  minimumCharacters: [],
  SettingsComponent: undefined,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: undefined,
  maximumCharacters: 500,
});
