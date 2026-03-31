'use client';

import dynamic from 'next/dynamic';

const RenderPreviewDate = dynamic(
  () =>
    import('@gitroom/frontend/components/preview/render.preview.date').then(
      (mod) => mod.RenderPreviewDate
    ),
  { ssr: false }
);

export const RenderPreviewDateClient = ({ date }: { date: string }) => {
  return <RenderPreviewDate date={date} />;
};
