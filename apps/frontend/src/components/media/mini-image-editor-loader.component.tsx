'use client';

import dynamic from 'next/dynamic';

/**
 * Konva referencia `window`/`canvas` no import — não roda no SSR. Mesmo padrão
 * do carousel-editor-loader.component.tsx.
 */
const MiniImageEditor = dynamic(
  () => import('./mini-image-editor.component'),
  {
    ssr: false,
    loading: () => (
      <div className="p-[40px] text-[13px] text-center">Carregando…</div>
    ),
  }
);

export const MiniImageEditorLoader = (props: {
  setMedia: (media: { id: string; path: string }[]) => void;
  closeModal: () => void;
  width?: number;
  height?: number;
  type?: 'image' | 'video';
}) => <MiniImageEditor {...props} />;
