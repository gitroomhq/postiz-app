'use client';

import { forwardRef } from 'react';
import type Konva from 'konva';
import { THUMB_WIDTH, type BrandKit, type Slide } from '@gitroom/carousel-engine';
import { CarouselStage } from './carousel-stage.component';

interface ThumbProps {
  slide: Slide;
  brand: BrandKit;
  ratio: '4:5' | '9:16';
  index: number;
  total: number;
  active: boolean;
  onClick: () => void;
  /** Largura de exibição do thumbnail (default 221). Export usa pixelRatio→1080 de qualquer forma. */
  displayWidth?: number;
  cta?: { show: boolean; label: string };
}

/**
 * Thumbnail = mesma cena renderizada num Stage menor e não-interativo (221px).
 * Também serve de fonte para o export: o ref do Stage é capturado em alta res
 * via toDataURL com pixelRatio = 1080/221.
 */
export const SlideThumbnail = forwardRef<Konva.Stage, ThumbProps>(function SlideThumbnail(
  { slide, brand, ratio, index, total, active, onClick, displayWidth = THUMB_WIDTH, cta },
  ref
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block rounded-[8px] overflow-hidden transition-all leading-[0]"
      style={{
        width: displayWidth,
        outline: active ? '2px solid var(--voc-rose)' : '1px solid var(--new-border)',
        outlineOffset: active ? '0' : '0',
      }}
    >
      <CarouselStage
        ref={ref}
        slide={slide}
        brand={brand}
        ratio={ratio}
        displayWidth={displayWidth}
        index={index}
        total={total}
        interactive={false}
        cta={cta}
      />
    </button>
  );
});
