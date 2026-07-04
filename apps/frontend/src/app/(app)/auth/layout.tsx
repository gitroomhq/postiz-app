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
    <div
      className="relative flex min-h-screen w-screen flex-1 gap-[12px] overflow-hidden p-[12px] text-[var(--voc-text-primary)]"
      style={{ background: 'var(--voc-bg-app)' }}
    >
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />

      {/* Ambient glows — "Aura Mágica" (docs/handoff-novo-design/vocaccio-system-design-final.md) */}
      <div className="voc-ambient-glows" aria-hidden>
        <div className="voc-glow voc-glow-1" />
        <div className="voc-glow voc-glow-2" />
        <div className="voc-glow voc-glow-3" />
      </div>

      <div className="voc-glass-card relative z-[1] flex flex-1 flex-col rounded-[var(--voc-radius-lg)] p-[12px] py-[40px] px-[20px] lg:w-[600px] lg:flex-none">
        <div className="mx-auto flex h-full w-full max-w-[440px] flex-col justify-center gap-[20px]">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>
      <div className="relative z-[1] hidden flex-1 flex-col items-center pt-[88px] text-[36px] lg:flex">
        <div className="text-center font-[800] tracking-[-0.02em]">
          Over{' '}
          <span
            className="bg-[image:var(--voc-text-gradient)] bg-clip-text text-transparent"
            style={{ WebkitTextFillColor: 'transparent' }}
          >
            20,000+
          </span>{' '}
          Entrepreneurs use
          <br />
          Vocaccio To Grow Their Social Presence
        </div>
        <TestimonialComponent />
      </div>
    </div>
  );
}
