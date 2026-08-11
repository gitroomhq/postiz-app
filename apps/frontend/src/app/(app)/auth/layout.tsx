import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="flex flex-1 gap-[12px] min-h-screen w-screen text-white">
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />
      <div className="flex flex-col items-center justify-center py-[40px] px-[20px] flex-1 lg:w-[600px] text-white bg-[#1A1919]">
        <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>
    </div>
  );
}
