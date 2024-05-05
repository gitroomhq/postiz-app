import { Layout } from '@gitroom/frontend/components/messages/layout';
export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';

export default async function LayoutWrapper({children}: {children: ReactNode}) {
  return (
      <Layout renderChildren={children} />
  );
}
