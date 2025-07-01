'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider({
  postComment: PostComment.COMMENT,
  minimumCharacters: [],
  SettingsComponent: null,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: undefined,
  maximumCharacters: 63206,
});
