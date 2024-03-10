export const dynamic = 'force-dynamic';

import { ReactNode } from 'react';

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <div className="absolute left-0 top-0 z-[0] h-[100vh] w-[100vw] overflow-hidden bg-loginBg bg-contain bg-no-repeat bg-left-top" />
      <div className="relative z-[1] pr-[100px] flex justify-end items-center h-[100vh] w-[100vw] overflow-hidden">
        <div className="w-[557px] flex h-[614px] bg-loginBox bg-contain">
          <div className="p-[32px] absolute w-[557px] h-[614px] text-white">
            {children}
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex-1 flex justify-end">
              <div className="absolute top-0 bg-gradient-to-t from-[#354258] w-[1px] translate-x-[22px] h-full" />
            </div>
            <div>
              <div className="absolute right-0 bg-gradient-to-l from-[#354258] h-[1px] translate-y-[22px] w-full" />
            </div>
          </div>
          <div className="absolute top-0 bg-gradient-to-t from-[#354258] w-[1px] -translate-x-[22px] h-full" />
          <div className="absolute right-0 bg-gradient-to-l from-[#354258] h-[1px] -translate-y-[22px] w-full" />
        </div>
      </div>
    </>
  );
}
