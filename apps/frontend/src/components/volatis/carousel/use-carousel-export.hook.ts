'use client';

import { useCallback } from 'react';
import type Konva from 'konva';
import {
  STAGE_WIDTH,
  THUMB_WIDTH,
  stageHeight,
  slideToDataUrl,
  slidesToZip,
  slidesToPdf,
  slideFileName,
  downloadDataUrl,
  downloadBlob,
  type Carousel,
} from '@gitroom/carousel-engine';

/**
 * Pipeline de export 100% no browser (Konva-native, sem Playwright/servidor).
 * Captura cada Stage de thumbnail em resolução nativa (pixelRatio = 1080/221).
 */
export function useCarouselExport(
  doc: Carousel,
  thumbRefs: React.MutableRefObject<(Konva.Stage | null)[]>
) {
  const slug = (doc.title || 'carrossel').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  const captureAll = useCallback((): string[] => {
    return thumbRefs.current
      .filter((s): s is Konva.Stage => !!s)
      .map((stage) => slideToDataUrl(stage, STAGE_WIDTH));
  }, [thumbRefs]);

  const exportPng = useCallback(
    (index: number) => {
      const stage = thumbRefs.current[index];
      if (!stage) return;
      downloadDataUrl(slideToDataUrl(stage, STAGE_WIDTH), `${slug}-${slideFileName(index)}`);
    },
    [thumbRefs, slug]
  );

  const exportZip = useCallback(async () => {
    const dataUrls = captureAll();
    const blob = await slidesToZip(
      dataUrls.map((dataUrl, i) => ({ name: slideFileName(i), dataUrl }))
    );
    downloadBlob(blob, `${slug}.zip`);
  }, [captureAll, slug]);

  const exportPdf = useCallback(async () => {
    const dataUrls = captureAll();
    const blob = await slidesToPdf(dataUrls, {
      width: STAGE_WIDTH,
      height: stageHeight(doc.aspectRatio),
    });
    downloadBlob(blob, `${slug}.pdf`);
  }, [captureAll, slug, doc.aspectRatio]);

  return { exportPng, exportZip, exportPdf, captureAll, THUMB_WIDTH };
}
