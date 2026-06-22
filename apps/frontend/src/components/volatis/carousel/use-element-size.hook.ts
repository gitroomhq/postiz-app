'use client';

import { useEffect, useRef, useState } from 'react';

interface Box {
  width: number;
  /** Altura VISÍVEL do elemento até o fim da viewport (estável, não cresce com o conteúdo). */
  availableHeight: number;
}

/**
 * Mede a largura do container e a altura disponível até o fim da viewport — para
 * o canvas Konva se ajustar ao espaço visível em vez de crescer com o próprio
 * conteúdo (evita o loop largura↔altura que empurrava o canvas pra fora da dobra).
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<Box>({ width: 0, availableHeight: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setBox({
        width: rect.width,
        availableHeight: Math.max(0, window.innerHeight - rect.top),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return { ref, ...box };
}
