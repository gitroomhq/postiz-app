import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { TestimonialComponent } from '@gitroom/frontend/components/auth/testimonial.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
const ReturnUrlComponent = loadDynamic(() => import('./return.url.component'));
export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const t = await getT();

  return (
    <div className="bg-lamboBlack flex flex-1 min-h-screen w-screen text-white">
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />
      <div className="flex flex-col py-[40px] px-[40px] flex-1 lg:w-[600px] lg:flex-none text-white bg-lamboBlack">
        <div className="w-full max-w-[440px] mx-auto justify-center gap-[20px] h-full flex flex-col text-white">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>
      <div className="flex-1 pt-[88px] hidden lg:flex flex-col items-center bg-lamboCharcoal font-lambo uppercase">
        <div className="text-center text-[54px] leading-[1.19]">
          All your social analytics
          <br />
          in <span className="text-lamboGold">one place</span>
        </div>
        <TestimonialComponent />
      </div>
    </div>
  );
}
