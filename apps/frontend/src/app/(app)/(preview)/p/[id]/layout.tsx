import { ReactNode } from 'react';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-pqBg text-pqText pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <PreviewWrapper>{children}</PreviewWrapper>
    </div>
  );
}
