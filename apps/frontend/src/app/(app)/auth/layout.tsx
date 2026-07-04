import { getT } from '@gitroom/react/translation/get.translation.service.backend';

export const dynamic = 'force-dynamic';
import { ReactNode } from 'react';
import loadDynamic from 'next/dynamic';
import { OrbitVideoBackdrop, OrbitVideoWords } from '@gitroom/frontend/components/auth/orbit-video.component';
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
      className="relative flex h-screen w-screen flex-1 gap-[12px] overflow-hidden p-[12px] text-[var(--voc-text-primary)]"
      style={{ background: 'var(--voc-bg-app)' }}
    >
      {/*<style>{`html, body {overflow-x: hidden;}`}</style>*/}
      <ReturnUrlComponent />

      {/* Vídeo de fundo — mobile: full-bleed atrás de tudo (card translúcido por cima).
          Desktop (lg+): contido no espaço à direita do card, como no design original. */}
      <div className="absolute inset-0 lg:left-[612px] overflow-hidden lg:rounded-[var(--voc-radius-lg)]">
        <OrbitVideoBackdrop />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 50%, transparent 30%, var(--voc-bg-app) 92%)' }}
        />
      </div>

      {/* Ambient glows — "Aura Mágica" (docs/handoff-novo-design/vocaccio-system-design-final.md) */}
      <div className="voc-ambient-glows" aria-hidden>
        <div className="voc-glow voc-glow-1" />
        <div className="voc-glow voc-glow-2" />
        <div className="voc-glow voc-glow-3" />
      </div>

      <div
        className="voc-glass-card voc-auth-card relative z-[1] flex flex-1 flex-col overflow-y-auto rounded-[var(--voc-radius-lg)] p-[12px] py-[24px] px-[20px] lg:w-[600px] lg:flex-none"
      >
        <div className="mx-auto flex w-full max-w-[440px] flex-col justify-center gap-[14px] my-auto">
          <LogoTextComponent />
          <div className="flex">{children}</div>
        </div>
      </div>
      <div className="relative z-[1] hidden flex-1 flex-col items-center pt-[64px] lg:flex">
        <div className="text-center max-w-[520px] px-[24px]">
          <h2 className="text-[30px] font-[800] tracking-[-0.02em]">
            <span
              className="bg-[image:var(--voc-text-gradient)] bg-clip-text text-transparent"
              style={{ WebkitTextFillColor: 'transparent' }}
            >
              Um Universo
            </span>{' '}
            de possibilidades
          </h2>
          <p className="mt-[10px] text-[14px] leading-relaxed text-[var(--voc-text-secondary)]">
            Um HUB que simplifica a vida de Creators que querem crescer no Digital sem esforço e sem perder a essência.
          </p>
        </div>
        <OrbitVideoWords />
      </div>
    </div>
  );
}
