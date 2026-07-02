'use client';

import { Fragment, useMemo, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { RichTextRun, TextNode } from '@gitroom/carousel-engine';
import { makeAxisLockBound } from './drag.util';

/**
 * Renderiza um TextNode com "word-level styling" — o diferencial de UX do Brands
 * Decoded. Konva.Text não suporta runs inline com cores diferentes, então
 * medimos e quebramos as palavras manualmente e desenhamos um Konva.Text por
 * palavra (com Rect de highlight atrás quando houver). Cada token guarda
 * `runIndex`/`segIndex` para que clicar a palavra no editor edite o run certo.
 */

const VOC_ROSE = '#cf6295';

interface Token {
  text: string;
  x: number;
  y: number;
  width: number;
  color: string;
  bold: boolean;
  highlight?: string;
  line: number;
  runIndex: number;
  segIndex: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function ctx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx as CanvasRenderingContext2D;
}

function fontString(node: TextNode, bold: boolean): string {
  const weight = bold ? Math.max(node.fontWeight, 700) : node.fontWeight;
  return `${node.italic ? 'italic ' : ''}${weight} ${node.fontSize}px "${node.fontFamily}"`;
}

function applyCase(text: string, node: TextNode, run: RichTextRun): string {
  if (run.uppercase || node.uppercase) return text.toUpperCase();
  return text;
}

/** Quebra os runs em tokens posicionados (greedy word wrap dentro de node.width). */
export function layoutRuns(node: TextNode): { tokens: Token[]; height: number } {
  const c = ctx();
  const lineH = node.fontSize * node.lineHeight;
  const spaceW = node.fontSize * 0.28;
  const tokens: Token[] = [];

  let cursorX = 0;
  let cursorY = 0;
  let line = 0;
  let lineHasContent = false;

  for (let ri = 0; ri < node.runs.length; ri++) {
    const run = node.runs[ri];
    const bold = !!run.bold;
    c.font = fontString(node, bold);
    // mesma segmentação (índices preservados) que o editor usa para destacar palavra
    const segs = applyCase(run.text, node, run).split(/(\s+)/);

    for (let si = 0; si < segs.length; si++) {
      const seg = segs[si];
      if (seg === '') continue;
      if (/^\s+$/.test(seg)) {
        if (lineHasContent) cursorX += spaceW;
        continue;
      }
      const w = c.measureText(seg).width + (seg.length - 1) * node.letterSpacing;
      if (lineHasContent && cursorX + w > node.width) {
        cursorX = 0;
        cursorY += lineH;
        line += 1;
        lineHasContent = false;
      }
      tokens.push({
        text: seg,
        x: cursorX,
        y: cursorY,
        width: w,
        color: run.color ?? node.fill,
        bold,
        highlight: run.highlight,
        line,
        runIndex: ri,
        segIndex: si,
      });
      cursorX += w;
      lineHasContent = true;
    }
  }

  // alinhamento: desloca cada linha pela folga (node.width - largura usada).
  if (node.align !== 'left') {
    const lineCount = line + 1;
    const lineRight = new Array<number>(lineCount).fill(0);
    for (const t of tokens) lineRight[t.line] = Math.max(lineRight[t.line], t.x + t.width);
    const byLine: Token[][] = Array.from({ length: lineCount }, () => []);
    for (const t of tokens) byLine[t.line].push(t);

    for (let li = 0; li < lineCount; li++) {
      const lineToks = byLine[li];
      const slack = node.width - lineRight[li];
      if (slack <= 0) continue;
      if (node.align === 'center') {
        for (const t of lineToks) t.x += slack / 2;
      } else if (node.align === 'right') {
        for (const t of lineToks) t.x += slack;
      } else if (node.align === 'justify' && li !== lineCount - 1 && lineToks.length > 1) {
        const extra = slack / (lineToks.length - 1);
        lineToks.forEach((t, k) => (t.x += extra * k));
      }
    }
  }

  return { tokens, height: cursorY + lineH };
}

/**
 * Liga/desliga o accent (cor da marca + negrito) numa palavra, dividindo o run
 * que a contém. É o motor do "clique na palavra → destaque" do editor.
 */
export function toggleWordColor(
  runs: RichTextRun[],
  runIndex: number,
  segIndex: number,
  accent: string
): RichTextRun[] {
  const run = runs[runIndex];
  if (!run) return runs;
  const segs = run.text.split(/(\s+)/);
  const word = segs[segIndex];
  if (word === undefined || /^\s*$/.test(word)) return runs;

  const before = segs.slice(0, segIndex).join('');
  const after = segs.slice(segIndex + 1).join('');
  const isAccent = run.color === accent;

  const out: RichTextRun[] = [];
  if (before) out.push({ ...run, text: before });
  out.push({
    ...run,
    text: word,
    color: isAccent ? undefined : accent,
    bold: isAccent ? false : true,
  });
  if (after) out.push({ ...run, text: after });

  return [...runs.slice(0, runIndex), ...out, ...runs.slice(runIndex + 1)];
}

interface RichTextProps {
  node: TextNode;
  selected?: boolean;
  onSelect?: () => void;
  onToggleWord?: (runIndex: number, segIndex: number) => void;
  /** Arraste (trava de eixo + margem). Requer scale + altura do canvas. */
  draggable?: boolean;
  scale?: number;
  canvasH?: number;
  onDragEnd?: (x: number, y: number) => void;
}

export const RichText = ({
  node,
  selected,
  onSelect,
  onToggleWord,
  draggable,
  scale = 1,
  canvasH = 0,
  onDragEnd,
}: RichTextProps) => {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const { tokens, height } = useMemo(() => layoutRuns(node), [node]);
  if (node.visible === false) return null;
  const lineH = node.fontSize * node.lineHeight;
  const pad = node.fontSize * 0.12;
  const interactive = !!(onSelect || onToggleWord);

  const handleToken = (t: Token) => {
    if (!interactive) return;
    // 1º clique seleciona o nó; com o nó já selecionado, clicar a palavra destaca.
    if (selected) onToggleWord?.(t.runIndex, t.segIndex);
    else onSelect?.();
  };

  const dragBound = makeAxisLockBound({ scale, canvasH, width: node.width, height, startRef });

  return (
    <Group
      x={node.x}
      y={node.y}
      rotation={node.rotation ?? 0}
      draggable={draggable}
      // limiar maior que o padrão do Konva (3px) — evita que jitter de mouse/trackpad
      // ao clicar numa palavra seja interpretado como início de arraste, o que
      // cancelava o clique (causa raiz do word-highlight "não funcionar").
      dragDistance={12}
      dragBoundFunc={draggable ? dragBound : undefined}
      onDragStart={() => {
        startRef.current = { x: node.x, y: node.y };
      }}
      onDragEnd={(e) => {
        onDragEnd?.(e.target.x(), e.target.y());
        startRef.current = null;
      }}
    >
      {selected && (
        <Rect
          x={-pad * 2}
          y={-pad * 2}
          width={node.width + pad * 4}
          height={height + pad * 2}
          stroke={VOC_ROSE}
          strokeWidth={2}
          dash={[8, 6]}
          cornerRadius={6}
          listening={false}
        />
      )}
      {tokens.map((t, i) => (
        <Fragment key={i}>
          {t.highlight && (
            <Rect
              x={t.x - pad}
              y={t.y - pad * 0.4}
              width={t.width + pad * 2}
              height={lineH}
              fill={t.highlight}
              cornerRadius={6}
              listening={false}
            />
          )}
          <Text
            x={t.x}
            y={t.y}
            text={t.text}
            fontFamily={node.fontFamily}
            fontSize={node.fontSize}
            fontStyle={`${node.italic ? 'italic ' : ''}${t.bold ? Math.max(node.fontWeight, 700) : node.fontWeight}`}
            letterSpacing={node.letterSpacing}
            fill={t.color}
            listening={interactive}
            onClick={() => handleToken(t)}
            onTap={() => handleToken(t)}
          />
        </Fragment>
      ))}
    </Group>
  );
};
