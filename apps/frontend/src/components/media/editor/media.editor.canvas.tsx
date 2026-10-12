'use client';

import { FC, PointerEvent, useCallback, useEffect, useRef } from 'react';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export type Rect = { x: number; y: number; w: number; h: number };
export type EditorTool = 'select' | 'draw' | 'crop';

interface LayerBase {
  id: string;
  // 0-100
  opacity: number;
  // degrees, around the centre of the layer bounds
  rotation: number;
}

export interface ImageLayer extends LayerBase {
  kind: 'image';
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextLayer extends LayerBase {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  outlineColor: string;
  outlineWidth: number;
  bgColor: string;
  bgOpacity: number;
  bgPadding: number;
}

export interface StrokeLayer extends LayerBase {
  kind: 'stroke';
  points: number[];
  color: string;
  width: number;
}

export type EditorLayer = ImageLayer | TextLayer | StrokeLayer;

export interface EditorDoc {
  // base size before rotation
  width: number;
  height: number;
  // blank canvas colour, empty for photos
  color: string;
  src?: string;
  mime?: string;
  name?: string;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  fade: number;
  vignette: number;
  sharpen: number;
  crop?: Rect;
  outputWidth?: number;
  layers: EditorLayer[];
}

const LINE_HEIGHT = 1.2;
const HANDLE = 14;

export const compSize = (doc: EditorDoc) =>
  doc.rotate % 180
    ? { w: doc.height, h: doc.width }
    : { w: doc.width, h: doc.height };

export const fullRect = (doc: EditorDoc): Rect => ({
  x: 0,
  y: 0,
  ...compSize(doc),
});

export const visibleRect = (doc: EditorDoc) => doc.crop || fullRect(doc);

export const ratioRect = (doc: EditorDoc, ratio?: number): Rect => {
  const { w, h } = compSize(doc);
  if (!ratio) {
    return fullRect(doc);
  }
  let cw = w;
  let ch = w / ratio;
  if (ch > h) {
    ch = h;
    cw = h * ratio;
  }
  return { x: (w - cw) / 2, y: (h - ch) / 2, w: cw, h: ch };
};

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    // without CORS the canvas could not be exported, so fail early instead
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });

export const newTextLayer = (
  doc: EditorDoc,
  font: string,
  text: string
): TextLayer => {
  const area = visibleRect(doc);
  const size = Math.max(16, Math.round(area.w / 12));
  return {
    id: makeId(10),
    kind: 'text',
    opacity: 100,
    rotation: 0,
    x: area.x + area.w / 2 - size * 3,
    y: area.y + area.h / 2 - size / 2,
    text,
    font,
    size,
    color: '#FFFFFF',
    bold: true,
    italic: false,
    align: 'center',
    outlineColor: '#000000',
    outlineWidth: 0,
    bgColor: '#000000',
    bgOpacity: 0,
    bgPadding: Math.round(size / 4),
  };
};

const fontString = (l: TextLayer) =>
  `${l.italic ? 'italic ' : ''}${l.bold ? 'bold ' : ''}${l.size}px "${
    l.font
  }", sans-serif`;

const measureText = (ctx: CanvasRenderingContext2D, l: TextLayer) => {
  ctx.font = fontString(l);
  const lines = l.text.split('\n');
  const w = Math.max(1, ...lines.map((line) => ctx.measureText(line).width));
  return { lines, w, h: lines.length * l.size * LINE_HEIGHT };
};

export const layerBounds = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer
): Rect => {
  if (l.kind === 'image') {
    return { x: l.x, y: l.y, w: l.w, h: l.h };
  }
  if (l.kind === 'text') {
    const m = measureText(ctx, l);
    const pad = Math.max(l.bgOpacity > 0 ? l.bgPadding : 0, l.outlineWidth);
    return { x: l.x - pad, y: l.y - pad, w: m.w + pad * 2, h: m.h + pad * 2 };
  }
  const xs = l.points.filter((_, i) => i % 2 === 0);
  const ys = l.points.filter((_, i) => i % 2 === 1);
  const half = l.width / 2;
  const x = Math.min(...xs) - half;
  const y = Math.min(...ys) - half;
  return {
    x,
    y,
    w: Math.max(...xs) + half - x,
    h: Math.max(...ys) + half - y,
  };
};

const centreOf = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

const turnAround = (
  x: number,
  y: number,
  c: { x: number; y: number },
  degrees: number
) => {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = x - c.x;
  const dy = y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
};

// applies the layer rotation, so drawing can use unrotated coordinates
const withRotation = (
  ctx: CanvasRenderingContext2D,
  bounds: Rect,
  degrees: number
) => {
  if (degrees) {
    const c = centreOf(bounds);
    ctx.translate(c.x, c.y);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.translate(-c.x, -c.y);
  }
};

const drawLayer = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer,
  images: Map<string, HTMLImageElement>
) => {
  const b = layerBounds(ctx, l);
  ctx.save();
  withRotation(ctx, b, l.rotation);
  if (l.opacity < 100 && l.kind === 'text' && l.outlineWidth > 0) {
    // drawn apart first, otherwise the outline shows through the faded fill
    const margin = l.size;
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.ceil(b.w + margin * 2));
    off.height = Math.max(1, Math.ceil(b.h + margin * 2));
    const offCtx = off.getContext('2d')!;
    offCtx.translate(margin - b.x, margin - b.y);
    drawContent(offCtx, l, images);
    ctx.globalAlpha = l.opacity / 100;
    ctx.drawImage(off, b.x - margin, b.y - margin);
  } else {
    ctx.globalAlpha = l.opacity / 100;
    drawContent(ctx, l, images);
  }
  ctx.restore();
};

const drawContent = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer,
  images: Map<string, HTMLImageElement>
) => {
  if (l.kind === 'image') {
    const img = images.get(l.src);
    if (img) {
      ctx.drawImage(img, l.x, l.y, l.w, l.h);
    }
    return;
  }
  ctx.save();
  if (l.kind === 'stroke') {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = l.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(l.points[0], l.points[1]);
    for (let i = 0; i < l.points.length; i += 2) {
      ctx.lineTo(l.points[i], l.points[i + 1]);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }
  const m = measureText(ctx, l);
  if (l.bgOpacity > 0) {
    const alpha = ctx.globalAlpha;
    ctx.globalAlpha = alpha * (l.bgOpacity / 100);
    ctx.fillStyle = l.bgColor;
    ctx.fillRect(
      l.x - l.bgPadding,
      l.y - l.bgPadding,
      m.w + l.bgPadding * 2,
      m.h + l.bgPadding * 2
    );
    ctx.globalAlpha = alpha;
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = l.align;
  ctx.lineJoin = 'round';
  const anchor =
    l.align === 'center' ? l.x + m.w / 2 : l.align === 'right' ? l.x + m.w : l.x;
  m.lines.forEach((line, i) => {
    const y = l.y + i * l.size * LINE_HEIGHT + (l.size * (LINE_HEIGHT - 1)) / 2;
    if (l.outlineWidth > 0) {
      ctx.strokeStyle = l.outlineColor;
      ctx.lineWidth = l.outlineWidth * 2;
      ctx.strokeText(line, anchor, y);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(line, anchor, y);
  });
  ctx.restore();
};

const sharpenFilter = (amount: number) => {
  const id = `postiz-editor-sharpen-${amount}`;
  if (!document.getElementById(id)) {
    let svg: Element | null = document.getElementById('postiz-editor-filters');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'postiz-editor-filters';
      svg.setAttribute('style', 'position:absolute;width:0;height:0');
      document.body.appendChild(svg);
    }
    const a = amount / 100;
    svg.insertAdjacentHTML(
      'beforeend',
      `<filter id="${id}" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 ${-a} 0 ${-a} ${
        1 + 4 * a
      } ${-a} 0 ${-a} 0"/></filter>`
    );
  }
  return `url(#${id})`;
};

const drawBase = (
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  base: HTMLImageElement,
  filter: string
) => {
  const { w, h } = compSize(doc);
  ctx.save();
  ctx.filter = filter;
  ctx.translate(w / 2, h / 2);
  // flip before rotating so flips follow the screen axes
  ctx.scale(doc.flipX ? -1 : 1, doc.flipY ? -1 : 1);
  ctx.rotate((doc.rotate * Math.PI) / 180);
  ctx.drawImage(base, -doc.width / 2, -doc.height / 2, doc.width, doc.height);
  ctx.restore();
};

// the adjusted photo is rendered once per change, not on every pointer move
const photoCache = new WeakMap<
  HTMLImageElement,
  { key: string; canvas: HTMLCanvasElement }
>();

const adjustedPhoto = (doc: EditorDoc, base: HTMLImageElement) => {
  const key = [
    doc.width,
    doc.height,
    doc.rotate,
    doc.flipX,
    doc.flipY,
    doc.brightness,
    doc.contrast,
    doc.saturation,
    doc.warmth,
    doc.fade,
    doc.vignette,
    doc.sharpen,
  ].join(',');
  const cached = photoCache.get(base);
  if (cached?.key === key) {
    return cached.canvas;
  }
  const { w, h } = compSize(doc);
  const canvas = cached?.canvas || document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  drawBase(
    ctx,
    doc,
    base,
    [
      `brightness(${doc.brightness}%)`,
      `contrast(${doc.contrast}%)`,
      `saturate(${doc.saturation}%)`,
      doc.sharpen ? sharpenFilter(doc.sharpen) : '',
    ].join(' ')
  );
  if (doc.warmth) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = (Math.abs(doc.warmth) / 100) * 0.7;
    ctx.fillStyle = doc.warmth > 0 ? '#FF8A00' : '#0077FF';
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  if (doc.fade) {
    const grey = Math.round(doc.fade * 0.8);
    ctx.globalCompositeOperation = 'lighten';
    ctx.fillStyle = `rgb(${grey}, ${grey}, ${grey})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (doc.vignette) {
    const r = Math.hypot(w, h) / 2;
    const gradient = ctx.createRadialGradient(w / 2, h / 2, r * 0.35, w / 2, h / 2, r);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${(doc.vignette / 100) * 0.85})`);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  if (doc.warmth || doc.fade || doc.vignette) {
    // keep transparent parts of the photo transparent
    ctx.globalCompositeOperation = 'destination-in';
    drawBase(ctx, doc, base, 'none');
  }
  ctx.globalCompositeOperation = 'source-over';
  photoCache.set(base, { key, canvas });
  return canvas;
};

// draws the document with `area` as the top-left of the output
export const renderDoc = (
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  images: Map<string, HTMLImageElement>,
  area: Rect
) => {
  const { w, h } = compSize(doc);
  ctx.save();
  ctx.translate(-area.x, -area.y);
  if (doc.color) {
    ctx.fillStyle = doc.color;
    ctx.fillRect(0, 0, w, h);
  }
  const base = doc.src && images.get(doc.src);
  if (base) {
    ctx.drawImage(adjustedPhoto(doc, base), 0, 0);
  }
  for (const layer of doc.layers) {
    drawLayer(ctx, layer, images);
  }
  ctx.restore();
};

export const normaliseAngle = (degrees: number) => {
  const a = ((Math.round(degrees) % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
};

// turns the document by ±90°, carrying every layer to its new position
export const rotateDoc = (
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  by: 90 | -90
): EditorDoc => {
  const { w, h } = compSize(doc);
  const turn = (x: number, y: number) =>
    by === 90 ? { x: h - y, y: x } : { x: y, y: w - x };
  // a single mirror reverses the direction the photo has to turn
  const photoTurn = doc.flipX !== doc.flipY ? -by : by;
  return {
    ...doc,
    rotate: (doc.rotate + photoTurn + 360) % 360,
    crop: undefined,
    layers: doc.layers.map((l) => {
      if (l.kind === 'stroke') {
        const points: number[] = [];
        for (let i = 0; i < l.points.length; i += 2) {
          const p = turn(l.points[i], l.points[i + 1]);
          points.push(p.x, p.y);
        }
        return { ...l, points };
      }
      // strokes keep their rotation, their points already turned
      const b = layerBounds(ctx, l);
      const centre = turn(b.x + b.w / 2, b.y + b.h / 2);
      return {
        ...l,
        x: l.x + centre.x - (b.x + b.w / 2),
        y: l.y + centre.y - (b.y + b.h / 2),
        rotation: normaliseAngle(l.rotation + by),
      };
    }),
  };
};

export const supportsFilters = () =>
  typeof CanvasRenderingContext2D !== 'undefined' &&
  'filter' in CanvasRenderingContext2D.prototype;

const contains = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const cropFromDrag = (
  doc: EditorDoc,
  sx: number,
  sy: number,
  px: number,
  py: number,
  ratio?: number
): Rect => {
  const { w, h } = compSize(doc);
  const cx = clamp(px, 0, w);
  const cy = clamp(py, 0, h);
  let rw = Math.abs(cx - sx);
  let rh = Math.abs(cy - sy);
  if (ratio) {
    const maxW = cx >= sx ? w - sx : sx;
    const maxH = cy >= sy ? h - sy : sy;
    rh = rw / ratio;
    if (rh > maxH) {
      rh = maxH;
      rw = rh * ratio;
    }
    if (rw > maxW) {
      rw = maxW;
      rh = rw / ratio;
    }
  }
  return {
    x: cx >= sx ? sx : sx - rw,
    y: cy >= sy ? sy : sy - rh,
    w: rw,
    h: rh,
  };
};

// the point in the unrotated frame of the layer
const toLayerFrame = (l: EditorLayer, b: Rect, x: number, y: number) =>
  turnAround(x, y, centreOf(b), -l.rotation);

const hitsLayer = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer,
  x: number,
  y: number
) => {
  const b = layerBounds(ctx, l);
  const p = toLayerFrame(l, b, x, y);
  return contains(b, p.x, p.y);
};

const ROTATE_HANDLE_GAP = 28;

const handles = (b: Rect, scale: number) => ({
  resize: { x: b.x + b.w, y: b.y + b.h },
  rotate: { x: b.x + b.w / 2, y: b.y - ROTATE_HANDLE_GAP * scale },
});

export const moveLayer = (l: EditorLayer, dx: number, dy: number): EditorLayer =>
  l.kind === 'stroke'
    ? {
        ...l,
        points: l.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)),
      }
    : { ...l, x: l.x + dx, y: l.y + dy };

const resizeLayer = (l: EditorLayer, bounds: Rect, dx: number): EditorLayer => {
  const factor = Math.max(0.05, (bounds.w + dx) / bounds.w);
  if (l.kind === 'image') {
    return { ...l, w: l.w * factor, h: l.h * factor };
  }
  if (l.kind === 'text') {
    return { ...l, size: Math.max(6, Math.round(l.size * factor)) };
  }
  return l;
};

type Drag =
  | { mode: 'crop'; sx: number; sy: number }
  | { mode: 'draw'; id: string }
  | {
      mode: 'move' | 'resize' | 'rotate';
      sx: number;
      sy: number;
      layer: EditorLayer;
      bounds: Rect;
    };

export const EditorCanvas: FC<{
  doc: EditorDoc;
  images: Map<string, HTMLImageElement>;
  tool: EditorTool;
  selectedId?: string;
  onSelect: (id?: string) => void;
  onBegin: () => void;
  onUpdate: (fn: (doc: EditorDoc) => EditorDoc) => void;
  onEnd: () => void;
  cropDraft?: Rect;
  onCropDraft: (rect: Rect) => void;
  cropRatio?: number;
  drawColor: string;
  drawSize: number;
  fontsVersion: number;
}> = (props) => {
  const {
    doc,
    images,
    tool,
    selectedId,
    onSelect,
    onBegin,
    onUpdate,
    onEnd,
    cropDraft,
    onCropDraft,
    cropRatio,
    drawColor,
    drawSize,
    fontsVersion,
  } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const area = tool === 'crop' ? fullRect(doc) : visibleRect(doc);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }
    const width = Math.max(1, Math.round(area.w));
    const height = Math.max(1, Math.round(area.h));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.clearRect(0, 0, width, height);
    renderDoc(ctx, doc, images, area);

    const scale = width / (canvas.getBoundingClientRect().width || width);
    ctx.save();
    ctx.translate(-area.x, -area.y);
    if (tool === 'crop' && cropDraft) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      ctx.rect(cropDraft.x, cropDraft.y, cropDraft.w, cropDraft.h);
      ctx.fill('evenodd');
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([6 * scale, 4 * scale]);
      ctx.strokeRect(cropDraft.x, cropDraft.y, cropDraft.w, cropDraft.h);
    }
    const selected = doc.layers.find((l) => l.id === selectedId);
    if (tool === 'select' && selected) {
      const b = layerBounds(ctx, selected);
      const hs = HANDLE * scale;
      const { resize, rotate } = handles(b, scale);
      withRotation(ctx, b, selected.rotation);
      // white under the dashes keeps the outline visible on any colour
      ctx.lineWidth = 2 * scale;
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y);
      ctx.lineTo(rotate.x, rotate.y);
      ctx.stroke();
      ctx.strokeStyle = '#612BD3';
      ctx.setLineDash([6 * scale, 4 * scale]);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#612BD3';
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(rotate.x, rotate.y, hs / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (selected.kind !== 'stroke') {
        ctx.fillRect(resize.x - hs / 2, resize.y - hs / 2, hs, hs);
        ctx.strokeRect(resize.x - hs / 2, resize.y - hs / 2, hs, hs);
      }
    }
    ctx.restore();
  }, [doc, images, tool, selectedId, cropDraft, fontsVersion]);

  const toPoint = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = ref.current!;
      const r = canvas.getBoundingClientRect();
      const scale = canvas.width / r.width;
      return {
        x: (e.clientX - r.left) * scale + area.x,
        y: (e.clientY - r.top) * scale + area.y,
        scale,
      };
    },
    [area.x, area.y]
  );

  const pointerDown = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx) {
        return;
      }
      ref.current!.setPointerCapture(e.pointerId);
      const p = toPoint(e);
      if (tool === 'crop') {
        const { w, h } = compSize(doc);
        drag.current = {
          mode: 'crop',
          sx: clamp(p.x, 0, w),
          sy: clamp(p.y, 0, h),
        };
        return;
      }
      if (tool === 'draw') {
        const id = makeId(10);
        onBegin();
        onUpdate((d) => ({
          ...d,
          layers: [
            ...d.layers,
            {
              id,
              kind: 'stroke',
              opacity: 100,
              rotation: 0,
              points: [p.x, p.y],
              color: drawColor,
              width: drawSize,
            },
          ],
        }));
        drag.current = { mode: 'draw', id };
        return;
      }
      const selected = doc.layers.find((l) => l.id === selectedId);
      if (selected) {
        const b = layerBounds(ctx, selected);
        const hs = HANDLE * p.scale;
        const local = toLayerFrame(selected, b, p.x, p.y);
        const near = (h: { x: number; y: number }) =>
          Math.abs(local.x - h.x) <= hs && Math.abs(local.y - h.y) <= hs;
        const { resize, rotate } = handles(b, p.scale);
        const mode = near(rotate)
          ? 'rotate'
          : selected.kind !== 'stroke' && near(resize)
          ? 'resize'
          : undefined;
        if (mode) {
          onBegin();
          drag.current = { mode, sx: p.x, sy: p.y, layer: selected, bounds: b };
          return;
        }
      }
      const hit = [...doc.layers]
        .reverse()
        .find((l) => hitsLayer(ctx, l, p.x, p.y));
      onSelect(hit?.id);
      if (hit) {
        onBegin();
        drag.current = {
          mode: 'move',
          sx: p.x,
          sy: p.y,
          layer: hit,
          bounds: layerBounds(ctx, hit),
        };
      }
    },
    [doc, tool, selectedId, drawColor, drawSize, toPoint]
  );

  const pointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const d = drag.current;
      if (!d) {
        return;
      }
      const p = toPoint(e);
      if (d.mode === 'crop') {
        onCropDraft(cropFromDrag(doc, d.sx, d.sy, p.x, p.y, cropRatio));
        return;
      }
      if (d.mode === 'draw') {
        onUpdate((current) => ({
          ...current,
          layers: current.layers.map((l) =>
            l.id === d.id && l.kind === 'stroke'
              ? { ...l, points: [...l.points, p.x, p.y] }
              : l
          ),
        }));
        return;
      }
      const dx = p.x - d.sx;
      const dy = p.y - d.sy;
      let next: EditorLayer;
      if (d.mode === 'move') {
        next = moveLayer(d.layer, dx, dy);
      } else if (d.mode === 'rotate') {
        const c = centreOf(d.bounds);
        const angle =
          d.layer.rotation +
          ((Math.atan2(p.y - c.y, p.x - c.x) - Math.atan2(d.sy - c.y, d.sx - c.x)) *
            180) /
            Math.PI;
        next = {
          ...d.layer,
          rotation: normaliseAngle(e.shiftKey ? Math.round(angle / 15) * 15 : angle),
        };
      } else {
        const ctx = ref.current!.getContext('2d')!;
        const local = turnAround(dx, dy, { x: 0, y: 0 }, -d.layer.rotation);
        const resized = resizeLayer(d.layer, d.bounds, local.x);
        // keep the top-left corner where it is on screen
        const b = layerBounds(ctx, resized);
        const before = turnAround(d.bounds.x, d.bounds.y, centreOf(d.bounds), d.layer.rotation);
        const after = turnAround(b.x, b.y, centreOf(b), d.layer.rotation);
        next = moveLayer(resized, before.x - after.x, before.y - after.y);
      }
      onUpdate((current) => ({
        ...current,
        layers: current.layers.map((l) => (l.id === next.id ? next : l)),
      }));
    },
    [doc, cropRatio, toPoint]
  );

  const pointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (d && d.mode !== 'crop') {
      onEnd();
    }
  }, []);

  return (
    <canvas
      ref={ref}
      className="max-w-full max-h-full touch-none select-none"
      style={{
        cursor: tool === 'select' ? 'default' : 'crosshair',
        background:
          'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 20px 20px',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    />
  );
};
