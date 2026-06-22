'use client';

import { useEffect, useState } from 'react';

/**
 * Carrega uma imagem para uso no Konva (native, sem dependência externa de
 * use-image — respeita a regra do CLAUDE.md de não instalar componentes de UI).
 */
export function useImage(src?: string): HTMLImageElement | undefined {
  const [image, setImage] = useState<HTMLImageElement>();

  useEffect(() => {
    if (!src) {
      setImage(undefined);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    const onLoad = () => setImage(img);
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [src]);

  return image;
}
