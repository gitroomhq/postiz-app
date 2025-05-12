'use client';

import { ReactNode } from 'react';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';
import { usePathname } from 'next/navigation';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

export default async function AppLayout({ children }: { children: ReactNode, params: any }) {
  const params = usePathname();
  const style = params.split('/').pop();
  return (
    <div className={`hideCopilot ${style} h-[100vh] !padding-[50px] w-full text-textColor flex flex-col !bg-none`}>
      <style>
        {`
          #add-edit-modal, .hideCopilot {
            background: transparent !important;
          }
          html body.dark, html {
            background: transparent !important;
          }
        `}
      </style>
      <PreviewWrapper>{children}</PreviewWrapper>
    </div>
  );
}
