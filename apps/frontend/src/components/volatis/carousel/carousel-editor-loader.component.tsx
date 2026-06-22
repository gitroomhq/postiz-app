'use client';

import dynamic from 'next/dynamic';

/**
 * Konva referencia `window`/`canvas` no import, então o editor NÃO pode rodar no
 * SSR. Carregamos client-side via next/dynamic(ssr:false).
 */
const CarouselEditor = dynamic(
  () => import('./carousel-editor.component').then((m) => m.CarouselEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex-1 grid place-items-center text-[13px]"
        style={{ color: 'var(--voc-ink-soft)' }}
      >
        Carregando editor…
      </div>
    ),
  }
);

export const CarouselEditorLoader = (props: {
  carouselId: string;
  crmClientId?: string | null;
}) => <CarouselEditor {...props} />;
