'use client';

import { useEffect, useState } from 'react';
import { ensureFontsLoaded, googleFontsHref } from '@gitroom/carousel-engine';

const LINK_ID = 'vocaccio-carousel-fonts';

/**
 * Injeta o <link> da Google Fonts e aguarda `document.fonts.ready`. O Konva só
 * rasteriza a fonte certa se ela já estiver carregada — então o editor espera
 * `ready` antes de habilitar export.
 */
export function useFontLoader(families: string[]) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.getElementById(LINK_ID)) {
      const link = document.createElement('link');
      link.id = LINK_ID;
      link.rel = 'stylesheet';
      link.href = googleFontsHref();
      document.head.appendChild(link);
    }
    let cancelled = false;
    ensureFontsLoaded(families).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [families.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return ready;
}
