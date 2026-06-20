import { ReactNode } from 'react';
import { AppLayout } from '@gitroom/frontend/components/launches/layout.standalone';
export default async function AppLayoutIn({
  children,
}: {
  children: ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
