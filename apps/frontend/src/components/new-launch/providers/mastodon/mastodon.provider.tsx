'use client';

import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: null,
  CustomPreviewComponent: undefined,
  dto: undefined,
  checkValidity: undefined,
  maximumCharacters: (settings) => {
    const value = settings?.find((s: any) => s?.title === 'Max characters')?.value;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
  },
});
