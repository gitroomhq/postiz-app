import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import { TestimonialComponent } from '@gitroom/frontend/components/auth/testimonial.component';
import { LogoTextComponent } from '@gitroom/frontend/components/ui/logo-text.component';
import { ReturnUrlWrapper } from './return-url-wrapper';

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await getT();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4efe6] text-[#0f2742]">
      <ReturnUrlWrapper />
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-[16px] p-[12px] lg:flex-row lg:p-[16px]">
        <div className="flex flex-1 flex-col rounded-[24px] border border-[#e7dfd2] bg-[#fffdf8] px-[20px] py-[24px] shadow-[0_24px_80px_rgba(15,39,66,0.08)] sm:px-[28px] sm:py-[32px] lg:max-w-[620px]">
          <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center gap-[20px]">
            <div className="flex items-center justify-between">
              <LogoTextComponent />
            </div>
            <div className="flex">{children}</div>
          </div>
        </div>

        <div className="hidden flex-1 flex-col justify-center rounded-[24px] border border-[#d7d0c5] bg-[linear-gradient(180deg,#f9f4eb_0%,#efe6d9_100%)] px-[28px] py-[32px] lg:flex">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-[20px]">
            <div className="max-w-[640px] text-[40px] leading-[1.05] tracking-[-0.04em] text-[#0f2742] xl:text-[52px]">
              Built for teams that want a cleaner social workflow without the
              purple SaaS noise.
            </div>
            <div className="max-w-[620px] text-[18px] leading-[30px] text-[#496173]">
              ReplyNodes keeps planning, approvals, publishing, and review in
              one calm system that reads well on desktop and mobile.
            </div>
            <TestimonialComponent />
          </div>
        </div>
      </div>
    </div>
  );
}