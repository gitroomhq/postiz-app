'use client';

import dynamic from 'next/dynamic';

const AgentationDev = dynamic(
  () => import('agentation').then((m) => ({ default: m.Agentation })),
  { ssr: false }
);

export const AgentationWrapper = () => {
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.NEXT_PUBLIC_SHOW_AGENTATION !== 'true'
  ) {
    return null;
  }

  return <AgentationDev endpoint="http://localhost:4747" />;
};
