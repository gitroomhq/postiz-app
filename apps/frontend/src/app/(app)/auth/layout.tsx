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
    <div className="relative bg-canvas flex flex-1 min-h-screen w-screen text-fg overflow-hidden">
      <ReturnUrlComponent />

      {/* Left: form column */}
      <div className="relative z-10 flex flex-col py-12 px-6 sm:px-10 flex-1 lg:w-[560px] lg:flex-none">
        <div className="w-full max-w-[400px] mx-auto justify-center gap-8 h-full flex flex-col">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>

      {/* Right: testimonial column (Linear-flat, no aurora) */}
      <div className="relative z-10 flex-1 hidden lg:flex border-l border-borderGlass">
        <div className="h-full w-full flex flex-col items-center justify-center px-12 py-16">
          <div className="text-center max-w-[520px] mb-12">
            <h2 className="text-display-2 leading-[1.04] tracking-[-0.03em] mb-4 font-semibold text-fg">
              All your social analytics in one place.
            </h2>
            <p className="text-body-lg text-fgMuted">
              Real follower counts across every platform we run.
            </p>
          </div>
          <TestimonialComponent />
        </div>
      </div>
    </div>
  );
}
