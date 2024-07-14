import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import { ReactNode } from 'react';
import Image from 'next/image';
import clsx from 'clsx';

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
          <div className="w-full relative">
            <div className="custom:fixed custom:text-left custom:left-[20px] custom:justify-start custom:top-[20px] absolute -top-[100px] text-white justify-center items-center w-full flex gap-[10px]">
              <Image
                src={isGeneral() ? '/postiz.svg' : '/logo.svg'}
                width={55}
                height={53}
                alt="Logo"
              />
              <div
                className={clsx(!isGeneral() ? 'mt-[12px]' : 'min-w-[80px]')}
              >
                {isGeneral() ? (
                  <img src="/postiz-text.svg" className="w-[80px]" />
                ) : (
                  <div className="text-[40px]">Gitroom</div>
                )}
              </div>
            </div>
          </div>
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
