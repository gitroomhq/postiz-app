import { STAGE_WIDTH } from '@gitroom/carousel-engine';

/** Margem segura (logical px) mín/máx para o drag — evita o nó sair da arte. */
export const DRAG_MARGIN = 56;

/**
 * dragBoundFunc do Konva que trava o movimento em UM eixo por arraste (sem
 * diagonal — espelha a regra da Máquina de referência) e mantém o nó dentro de
 * uma margem segura. Opera em coords absolutas (o stage é escalado), então
 * converte por `scale`. `startRef` guarda a posição logical no início do arraste
 * (definida no onDragStart) e é lida ao vivo a cada passo.
 */
export function makeAxisLockBound(opts: {
  scale: number;
  canvasH: number;
  width: number;
  height: number;
  startRef: { current: { x: number; y: number } | null };
}) {
  return (pos: { x: number; y: number }) => {
    const s = opts.scale || 1;
    let lx = pos.x / s;
    let ly = pos.y / s;

    // trava no eixo dominante desde o início do arraste
    const start = opts.startRef.current;
    if (start) {
      const dx = Math.abs(lx - start.x);
      const dy = Math.abs(ly - start.y);
      if (dx >= dy) ly = start.y;
      else lx = start.x;
    }

    // clamp dentro da margem segura
    const maxX = Math.max(DRAG_MARGIN, STAGE_WIDTH - DRAG_MARGIN - opts.width);
    const maxY = Math.max(DRAG_MARGIN, opts.canvasH - DRAG_MARGIN - opts.height);
    lx = Math.min(Math.max(lx, DRAG_MARGIN), maxX);
    ly = Math.min(Math.max(ly, DRAG_MARGIN), maxY);

    return { x: lx * s, y: ly * s };
  };
}
