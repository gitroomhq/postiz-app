'use client';

import dynamicLoad from 'next/dynamic';

const ChangeDirComponent = dynamicLoad(
  () =>
    import('@gitroom/frontend/components/new-layout/change.dir').then(
      (mod) => mod.ChangeDir
    ),
  {
    ssr: false,
  }
);

export const ChangeDirClient = () => {
  return <ChangeDirComponent />;
};
