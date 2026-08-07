'use client';

import { RenderPreviewDate } from '@gitroom/frontend/components/preview/render.preview.date';

export const RenderPreviewDateClient = ({ date }: { date: string }) => {
  return <RenderPreviewDate date={date} />;
};
