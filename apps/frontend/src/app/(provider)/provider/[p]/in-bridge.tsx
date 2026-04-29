'use client';
import dynamic from 'next/dynamic';
import { FC } from 'react';
const Bridge = dynamic(
  () =>
    import(
      './bridge'
    ).then((mod) => mod.default),
  { ssr: false }
);
export const InBridge: FC<{ provider: string }> = ({ provider }) => {
  return <Bridge provider={provider} />;
};
