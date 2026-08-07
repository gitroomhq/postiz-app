import { ReactNode } from 'react';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-pqBg text-pqText">
      <PreviewWrapper>{children}</PreviewWrapper>
    </div>
  );
}
