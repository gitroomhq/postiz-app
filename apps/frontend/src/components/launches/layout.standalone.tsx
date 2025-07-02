'use client';

import { ReactNode, useMemo } from 'react';
import { PreviewWrapper } from '@gitroom/frontend/components/preview/preview.wrapper';
import { usePathname } from 'next/navigation';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
export const AppLayout = ({ children }: { children: ReactNode }) => {
  const params = usePathname();
  const style = useMemo(() => {
    const all = params.split('/');
    all.pop();
    return all.pop();
  }, [params]);
  return (
    <div
      className={`hideCopilot ${style} h-[100vh] !padding-[50px] w-full text-textColor flex flex-col !bg-none`}
    >
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
};
