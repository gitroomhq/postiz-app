'use client';

import {
  FC,
  MouseEvent,
  PointerEvent,
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

export type Rect = { x: number; y: number; w: number; h: number };
export type EditorTool = 'select' | 'draw' | 'crop' | 'shape';
export type EditorZoom = 'fit' | number;

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

export type ShapeKind = 'rect' | 'ellipse' | 'line' | 'arrow';

export interface ShapeLayer extends LayerBase {
  kind: 'shape';
  shape: ShapeKind;
  // lines run from (x, y) to (x + w, y + h), so w and h can be negative
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeWidth: number;
}

export interface SvgLayer extends LayerBase {
  kind: 'svg';
  // cleaned by parseSvg, every colour written as #rrggbb
  markup: string;
  x: number;
  y: number;
  w: number;
  h: number;
  // new colours keyed by the colour in the markup
  fills: Record<string, string>;
  strokes: Record<string, string>;
  // percent, keyed by the colour in the markup like fills and strokes
  fillOpacities: Record<string, number>;
  strokeOpacities: Record<string, number>;
  // percent of the svg's own stroke widths
  strokeScale: number;
  // a stroke for svgs without one, its width in percent of the svg width
  outline: string;
  outlineWidth: number;
}

export type EditorLayer =
  | ImageLayer
  | TextLayer
  | StrokeLayer
  | ShapeLayer
  | SvgLayer;

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

export const MAX_SIZE = 8000;

export const NEUTRAL_ADJUSTMENTS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  fade: 0,
  vignette: 0,
  sharpen: 0,
};

export type Adjustment = keyof typeof NEUTRAL_ADJUSTMENTS;

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

const fontString = (l: TextLayer, size = l.size) =>
  `${l.italic ? 'italic ' : ''}${l.bold ? 'bold ' : ''}${size}px "${
    l.font
  }", sans-serif`;

const measureText = (ctx: CanvasRenderingContext2D, l: TextLayer) => {
  ctx.font = fontString(l);
  const lines = l.text.split('\n');
  const w = Math.max(1, ...lines.map((line) => ctx.measureText(line).width));
  return { lines, w, h: lines.length * l.size * LINE_HEIGHT };
};

const isLine = (l: ShapeLayer) => l.shape === 'line' || l.shape === 'arrow';

const arrowHead = (l: ShapeLayer) =>
  l.shape === 'arrow' ? Math.max(l.strokeWidth * 3, 12) : l.strokeWidth / 2;

// the text itself, without the background padding or outline
export const textBox = (ctx: CanvasRenderingContext2D, l: TextLayer): Rect => {
  const m = measureText(ctx, l);
  return { x: l.x, y: l.y, w: m.w, h: m.h };
};

export const layerBounds = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer
): Rect => {
  if (l.kind === 'image' || l.kind === 'svg') {
    return { x: l.x, y: l.y, w: l.w, h: l.h };
  }
  if (l.kind === 'shape') {
    const pad = isLine(l) ? arrowHead(l) : l.strokeWidth / 2;
    const x = Math.min(l.x, l.x + l.w) - pad;
    const y = Math.min(l.y, l.y + l.h) - pad;
    return { x, y, w: Math.abs(l.w) + pad * 2, h: Math.abs(l.h) + pad * 2 };
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

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_SVG_LENGTH = 1_000_000;
const PAINT_ATTRIBUTES = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'];
const PAINT_PROPERTY =
  /(^|[;{\s])(fill|stroke|stop-color|flood-color|lighting-color)(\s*:\s*)([^;}!]+)/gi;
const STROKE_WIDTH_PROPERTY = /(^|[;{\s])(stroke-width)(\s*:\s*)([\d.]+)/gi;
const SVG_SHAPES = 'path, rect, circle, ellipse, polygon, polyline, text';
const SAFE_HREF = /^(#|data:image\/(png|jpe?g|gif|webp);)/i;

type Paint = 'fill' | 'stroke';

let colorCtx: CanvasRenderingContext2D | null | undefined;

// any css colour as #rrggbb, undefined for none, gradients and see-through colours
const toHex = (value: string) => {
  const v = value.trim();
  if (/^currentcolor$/i.test(v)) {
    // what an svg drawn as an image falls back to
    return '#000000';
  }
  if (!v || /^(none|transparent|inherit|initial|unset)$/i.test(v) || /^url\(/i.test(v)) {
    return undefined;
  }
  colorCtx = colorCtx ?? document.createElement('canvas').getContext('2d');
  if (!colorCtx) {
    return undefined;
  }
  // an invalid colour leaves fillStyle as it was, so try two starting values
  colorCtx.fillStyle = '#000000';
  colorCtx.fillStyle = v;
  const first = String(colorCtx.fillStyle);
  colorCtx.fillStyle = '#ffffff';
  colorCtx.fillStyle = v;
  return first === colorCtx.fillStyle && first.startsWith('#') ? first : undefined;
};

const svgElements = (root: Element) => [root, ...Array.from(root.querySelectorAll('*'))];

// rewrites every colour in attributes, inline styles and style sheets with what swap returns
const eachColor = (root: Element, swap: (color: string, paint: Paint) => string) => {
  const paint = (name: string, value: string) => {
    const color = toHex(value);
    return color ? swap(color, name.toLowerCase() === 'stroke' ? 'stroke' : 'fill') : value;
  };
  const inCss = (css: string) =>
    css.replace(PAINT_PROPERTY, (_, pre, name, sep, value) => pre + name + sep + paint(name, value));
  for (const el of svgElements(root)) {
    for (const name of PAINT_ATTRIBUTES) {
      const value = el.getAttribute(name);
      if (value) {
        el.setAttribute(name, paint(name, value));
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute('style', inCss(style));
    }
    if (el.localName === 'style' && el.textContent) {
      el.textContent = inCss(el.textContent);
    }
  }
};

const scaleStrokes = (root: Element, by: number) => {
  const inCss = (css: string) =>
    css.replace(
      STROKE_WIDTH_PROPERTY,
      (_, pre, name, sep, value) => pre + name + sep + parseFloat(value) * by
    );
  for (const el of svgElements(root)) {
    const width = el.getAttribute('stroke-width');
    const n = parseFloat(width || '');
    if (width && Number.isFinite(n)) {
      el.setAttribute('stroke-width', width.replace(/^\s*[\d.]+/, String(n * by)));
    }
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute('style', inCss(style));
    }
    if (el.localName === 'style' && el.textContent) {
      el.textContent = inCss(el.textContent);
    }
  }
  if (!root.getAttribute('stroke-width')) {
    // the default width is 1
    root.setAttribute('stroke-width', String(by));
  }
};

const svgRoot = (markup: string) =>
  new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;

const viewBoxOf = (root: Element) =>
  (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);

// cleans pasted or uploaded markup: no scripts, handlers or outside links, and a known size
export const parseSvg = (input: string) => {
  let markup = input.trim();
  if (!markup || markup.length > MAX_SVG_LENGTH) {
    return undefined;
  }
  // svg copied out of html often leaves the namespaces off
  if (!/\sxmlns=/i.test(markup.match(/<svg\b[^>]*>/i)?.[0] || '')) {
    markup = markup.replace(/<svg\b/i, `<svg xmlns="${SVG_NS}"`);
  }
  if (/xlink:/.test(markup) && !/xmlns:xlink=/.test(markup)) {
    markup = markup.replace(/<svg\b/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = parsed.documentElement;
  if (
    root.localName !== 'svg' ||
    root.namespaceURI !== SVG_NS ||
    parsed.getElementsByTagName('parsererror').length
  ) {
    return undefined;
  }
  root
    .querySelectorAll('script, foreignObject, animate, animateMotion, animateTransform, set')
    .forEach((el) => el.remove());
  // only links inside the svg survive, in attributes and in css
  const localUrls = (value: string) =>
    value.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, 'none');
  for (const el of svgElements(root)) {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (
        name.startsWith('on') ||
        ((name === 'href' || name.endsWith(':href')) && !SAFE_HREF.test(attr.value.trim()))
      ) {
        el.removeAttribute(attr.name);
      } else if (/url\(|@import/i.test(attr.value)) {
        el.setAttribute(attr.name, localUrls(attr.value));
      }
    }
    if (el.localName === 'style' && el.textContent) {
      el.textContent = localUrls(el.textContent);
    }
  }

  let [, , w, h] = viewBoxOf(root);
  if (!(w > 0 && h > 0)) {
    const length = (name: string) => {
      const value = (root.getAttribute(name) || '').trim();
      return /^[\d.]+(px)?$/.test(value) ? parseFloat(value) : NaN;
    };
    w = length('width');
    h = length('height');
    if (!(w > 0 && h > 0)) {
      return undefined;
    }
    root.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }
  // drawn as an image, the svg needs its own size
  root.setAttribute('width', String(w));
  root.setAttribute('height', String(h));

  // shapes without a fill are black, an explicit fill makes that colour editable too;
  // classes are left alone, their fill is likely in a style sheet
  const unfilled = Array.from(root.querySelectorAll(SVG_SHAPES)).some(
    (el) =>
      !el.closest('[fill], [class]') && !/fill\s*:/i.test(el.getAttribute('style') || '')
  );
  if (unfilled) {
    root.setAttribute('fill', '#000000');
  }
  eachColor(root, (color) => color);
  const cleaned = new XMLSerializer().serializeToString(root);
  // checked again after cleaning, which can make the markup longer, so stored layers still load
  return cleaned.length > MAX_SVG_LENGTH ? undefined : { markup: cleaned, w, h };
};

// the panel shows one svg at a time, so one result is enough to cache
let lastColors: { markup: string; colors: Record<Paint, string[]> } | undefined;

export const svgColors = (markup: string) => {
  if (lastColors?.markup !== markup) {
    const colors: Record<Paint, string[]> = { fill: [], stroke: [] };
    eachColor(svgRoot(markup), (color, paint) => {
      if (!colors[paint].includes(color)) {
        colors[paint].push(color);
      }
      return color;
    });
    lastColors = { markup, colors };
  }
  return lastColors.colors;
};

// an alpha in the colour itself works the same in attributes, inline styles and style sheets
const withOpacity = (hex: string, percent = 100) =>
  percent >= 100
    ? hex
    : `rgba(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${
        Math.max(0, percent) / 100
      })`;

const svgUrl = (l: SvgLayer) => {
  const root = svgRoot(l.markup);
  eachColor(root, (color, paint) =>
    paint === 'stroke'
      ? withOpacity(l.strokes[color] || color, l.strokeOpacities[color])
      : withOpacity(l.fills[color] || color, l.fillOpacities[color])
  );
  if (l.strokeScale !== 100) {
    scaleStrokes(root, l.strokeScale / 100);
  }
  if (l.outlineWidth > 0) {
    root.setAttribute('stroke', l.outline);
    root.setAttribute('stroke-width', String((l.outlineWidth / 100) * viewBoxOf(root)[2]));
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    new XMLSerializer().serializeToString(root)
  )}`;
};

// rendered svgs by layer id; the previous one stays on screen while a recoloured one loads
const svgRasters = new Map<
  string,
  {
    key: string;
    img?: HTMLImageElement;
    shown?: HTMLImageElement;
    settled: boolean;
    loading: Promise<void>;
  }
>();

// the markup of a layer never changes, only its colours and strokes
const svgKey = (l: SvgLayer) =>
  JSON.stringify([
    l.fills,
    l.strokes,
    l.fillOpacities,
    l.strokeOpacities,
    l.strokeScale,
    l.outline,
    l.outlineWidth,
  ]);

const svgRaster = (l: SvgLayer) => {
  const raster = svgRasters.get(l.id);
  return raster?.img || raster?.shown;
};

// renders the svg layers that changed, true if there was anything to render
export const loadSvgs = async (doc: EditorDoc) => {
  // an undone delete just renders again
  const ids = new Set(doc.layers.map((l) => l.id));
  for (const id of Array.from(svgRasters.keys())) {
    if (!ids.has(id)) {
      svgRasters.delete(id);
    }
  }
  const loading = doc.layers.flatMap((l) => {
    if (l.kind !== 'svg') {
      return [];
    }
    const key = svgKey(l);
    const current = svgRasters.get(l.id);
    if (current?.key === key) {
      return current.settled ? [] : [current.loading];
    }
    const raster = {
      key,
      shown: current?.img || current?.shown,
      img: undefined as HTMLImageElement | undefined,
      settled: false,
      loading: loadImage(svgUrl(l))
        .then((img) => {
          raster.img = img;
        })
        .catch(() => undefined)
        .finally(() => {
          raster.settled = true;
        }),
    };
    svgRasters.set(l.id, raster);
    return [raster.loading];
  });
  await Promise.all(loading);
  return loading.length > 0;
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
  if (l.kind === 'image' || l.kind === 'svg') {
    const img = l.kind === 'image' ? images.get(l.src) : svgRaster(l);
    if (img) {
      ctx.drawImage(img, l.x, l.y, l.w, l.h);
    }
    return;
  }
  ctx.save();
  if (l.kind === 'shape') {
    ctx.lineWidth = l.strokeWidth;
    ctx.strokeStyle = l.stroke;
    ctx.fillStyle = l.stroke;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (isLine(l)) {
      const angle = Math.atan2(l.h, l.w);
      const head = l.shape === 'arrow' ? arrowHead(l) : 0;
      const ex = l.x + l.w;
      const ey = l.y + l.h;
      // the line stops at the base of the head so its end does not poke out
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(ex - Math.cos(angle) * head * 0.8, ey - Math.sin(angle) * head * 0.8);
      ctx.stroke();
      if (head) {
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(
          ex - head * Math.cos(angle - Math.PI / 7),
          ey - head * Math.sin(angle - Math.PI / 7)
        );
        ctx.lineTo(
          ex - head * Math.cos(angle + Math.PI / 7),
          ey - head * Math.sin(angle + Math.PI / 7)
        );
        ctx.closePath();
        ctx.fill();
      }
    } else {
      if (l.shape === 'rect') {
        ctx.rect(l.x, l.y, l.w, l.h);
      } else {
        ctx.ellipse(
          l.x + l.w / 2,
          l.y + l.h / 2,
          Math.abs(l.w / 2),
          Math.abs(l.h / 2),
          0,
          0,
          Math.PI * 2
        );
      }
      if (l.fillOpacity > 0) {
        const alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * (l.fillOpacity / 100);
        ctx.fillStyle = l.fill;
        ctx.fill();
        ctx.globalAlpha = alpha;
      }
      if (l.strokeWidth > 0) {
        ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
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

// a 3×3 sharpen on the pixels themselves: an svg filter (ctx.filter = 'url(#…)')
// leaves the photo blank in some Chrome setups and is missing in Safari
const sharpenPixels = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) => {
  const image = ctx.getImageData(0, 0, w, h);
  const src = image.data;
  const out = new Uint8ClampedArray(src);
  const a = amount / 100;
  const centre = 1 + 4 * a;
  const row = w * 4;
  for (let y = 0; y < h; y++) {
    // edge pixels repeat themselves instead of reading outside the image
    const up = y > 0 ? -row : 0;
    const down = y < h - 1 ? row : 0;
    for (let x = 0; x < w; x++) {
      const left = x > 0 ? -4 : 0;
      const right = x < w - 1 ? 4 : 0;
      const i = (y * w + x) * 4;
      // alpha stays as it is
      for (let p = i; p < i + 3; p++) {
        out[p] =
          centre * src[p] - a * (src[p + up] + src[p + down] + src[p + left] + src[p + right]);
      }
    }
  }
  image.data.set(out);
  ctx.putImageData(image, 0, 0);
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
    ].join(' ')
  );
  if (doc.sharpen) {
    sharpenPixels(ctx, w, h, doc.sharpen);
  }
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

// maps every position to p * scale + offset and every size to size * scale
const transformLayer = (
  l: EditorLayer,
  scale: number,
  dx: number,
  dy: number
): EditorLayer => {
  if (l.kind === 'stroke') {
    return {
      ...l,
      points: l.points.map((v, i) => v * scale + (i % 2 === 0 ? dx : dy)),
      width: l.width * scale,
    };
  }
  const moved = { ...l, x: l.x * scale + dx, y: l.y * scale + dy };
  if (moved.kind === 'text') {
    return {
      ...moved,
      size: moved.size * scale,
      outlineWidth: moved.outlineWidth * scale,
      bgPadding: moved.bgPadding * scale,
    };
  }
  if (moved.kind === 'shape') {
    return {
      ...moved,
      w: moved.w * scale,
      h: moved.h * scale,
      strokeWidth: moved.strokeWidth * scale,
    };
  }
  return { ...moved, w: moved.w * scale, h: moved.h * scale };
};

// a layer scaled to a canvas 1 unit wide, plus its vertical centre as a share of the height
export interface PresetLayer {
  layer: EditorLayer;
  centreY: number;
}

export const toPresetLayers = (
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc
): PresetLayer[] => {
  const area = visibleRect(doc);
  return doc.layers.map((l) => ({
    layer: transformLayer(l, 1 / area.w, -area.x / area.w, -area.y / area.w),
    centreY: (centreOf(layerBounds(ctx, l)).y - area.y) / area.h,
  }));
};

export const fromPresetLayers = (
  ctx: CanvasRenderingContext2D,
  doc: EditorDoc,
  layers: PresetLayer[]
): EditorLayer[] => {
  const area = visibleRect(doc);
  return layers.map(({ layer, centreY }) => {
    let l = { ...transformLayer(layer, area.w, area.x, area.y), id: makeId(10) };
    if (l.kind === 'text') {
      l = {
        ...l,
        size: Math.max(6, Math.round(l.size)),
        outlineWidth: Math.round(l.outlineWidth),
        bgPadding: Math.round(l.bgPadding),
      };
    }
    if (l.kind === 'shape') {
      l = {
        ...l,
        strokeWidth: Math.max(isLine(l) ? 1 : 0, Math.round(l.strokeWidth)),
      };
    }
    const y = centreOf(layerBounds(ctx, l)).y;
    return moveLayer(l, 0, area.y + centreY * area.h - y);
  });
};

export const supportsFilters = () =>
  typeof CanvasRenderingContext2D !== 'undefined' &&
  'filter' in CanvasRenderingContext2D.prototype;

const contains = (r: Rect, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// a crop covering the whole image has nowhere to go, so dragging inside it draws a new one
const insideCrop = (doc: EditorDoc, crop: Rect | undefined, x: number, y: number) => {
  const { w, h } = compSize(doc);
  return !!crop && (crop.w < w || crop.h < h) && contains(crop, x, y);
};

const movedCrop = (doc: EditorDoc, crop: Rect, dx: number, dy: number): Rect => {
  const { w, h } = compSize(doc);
  return {
    ...crop,
    x: clamp(crop.x + dx, 0, w - crop.w),
    y: clamp(crop.y + dy, 0, h - crop.h),
  };
};

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

const distanceToSegment = (l: ShapeLayer, x: number, y: number) => {
  const length = l.w * l.w + l.h * l.h;
  const t = length ? clamp(((x - l.x) * l.w + (y - l.y) * l.h) / length, 0, 1) : 0;
  return Math.hypot(x - (l.x + t * l.w), y - (l.y + t * l.h));
};

const hitsLayer = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer,
  x: number,
  y: number,
  scale: number
) => {
  const b = layerBounds(ctx, l);
  const p = toLayerFrame(l, b, x, y);
  if (l.kind === 'shape' && isLine(l)) {
    // the bounds of a diagonal line would cover most of the photo
    return distanceToSegment(l, p.x, p.y) <= l.strokeWidth / 2 + 8 * scale;
  }
  return contains(b, p.x, p.y);
};

// the axis-aligned box around a rotated layer
const turnedBox = (b: Rect, degrees: number): Rect => {
  if (!degrees) {
    return b;
  }
  const corners = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ].map(([x, y]) => turnAround(x, y, centreOf(b), degrees));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

type Guides = { x?: number; y?: number };

// column and row spacing in image pixels, either side may be off
export type GridSpacing = { x?: number; y?: number };

// grid lines from the top-left of the visible area
const gridLines = (area: Rect, grid: GridSpacing) => {
  // the epsilon keeps the closing line when the spacing divides the area into a fraction
  const lines = (from: number, length: number, size?: number) =>
    size
      ? Array.from(
          { length: Math.floor(length / size + 1e-6) + 1 },
          (_, i) => from + i * size
        )
      : [];
  return {
    xs: lines(area.x, area.w, grid.x),
    ys: lines(area.y, area.h, grid.y),
  };
};

// lines a few screen pixels apart would cover the photo, so they are neither drawn nor snapped to
const drawnGrid = (grid: GridSpacing | undefined, scale: number): GridSpacing => {
  const shown = (size?: number) => (size && size / scale >= 4 ? size : undefined);
  return { x: shown(grid?.x), y: shown(grid?.y) };
};

type Targets = { xs: number[]; ys: number[] };

// the edges and centre of the canvas, plus the grid lines when the grid is on
const snapTargets = (area: Rect, grid: GridSpacing): Targets => {
  const lines = gridLines(area, grid);
  return {
    xs: [area.x, area.x + area.w / 2, area.x + area.w, ...lines.xs],
    ys: [area.y, area.y + area.h / 2, area.y + area.h, ...lines.ys],
  };
};

const closest = (edges: number[], targets: number[], tolerance: number) => {
  let best: { diff: number; at: number } | undefined;
  for (const edge of edges) {
    for (const at of targets) {
      const diff = at - edge;
      if (Math.abs(diff) <= tolerance && (!best || Math.abs(diff) < Math.abs(best.diff))) {
        best = { diff, at };
      }
    }
  }
  return best;
};

// snaps the edges or centre of the layer to the nearest target
const snapLayer = (
  ctx: CanvasRenderingContext2D,
  l: EditorLayer,
  targets: Targets,
  tolerance: number
): { layer: EditorLayer; guides: Guides } => {
  const box = turnedBox(layerBounds(ctx, l), l.rotation);
  const x = closest([box.x, box.x + box.w / 2, box.x + box.w], targets.xs, tolerance);
  const y = closest([box.y, box.y + box.h / 2, box.y + box.h], targets.ys, tolerance);
  return {
    layer: moveLayer(l, x?.diff || 0, y?.diff || 0),
    guides: { x: x?.at, y: y?.at },
  };
};

// keeps the start point, Shift makes squares, circles and 45° lines
const shapeFromDrag = (
  l: ShapeLayer,
  sx: number,
  sy: number,
  px: number,
  py: number,
  constrain: boolean
): ShapeLayer => {
  let w = px - sx;
  let h = py - sy;
  if (isLine(l)) {
    if (constrain) {
      const angle = Math.round(Math.atan2(h, w) / (Math.PI / 4)) * (Math.PI / 4);
      const length = Math.hypot(w, h);
      w = Math.cos(angle) * length;
      h = Math.sin(angle) * length;
    }
    return { ...l, x: sx, y: sy, w, h };
  }
  if (constrain) {
    const side = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * side;
    h = Math.sign(h || 1) * side;
  }
  return {
    ...l,
    x: Math.min(sx, sx + w),
    y: Math.min(sy, sy + h),
    w: Math.abs(w),
    h: Math.abs(h),
  };
};

export const newShapeLayer = (
  doc: EditorDoc,
  shape: ShapeKind,
  x: number,
  y: number
): ShapeLayer => {
  const line = shape === 'line' || shape === 'arrow';
  return {
    id: makeId(10),
    kind: 'shape',
    opacity: 100,
    rotation: 0,
    shape,
    x,
    y,
    w: 0,
    h: 0,
    fill: '#612BD3',
    fillOpacity: line ? 0 : 100,
    stroke: '#FFFFFF',
    strokeWidth: line ? Math.max(2, Math.round(visibleRect(doc).w / 150)) : 0,
  };
};

// centred, fitting a third of the visible area
export const newSvgLayer = (
  doc: EditorDoc,
  svg: { markup: string; w: number; h: number }
): SvgLayer => {
  const area = visibleRect(doc);
  const scale = Math.min(area.w / 3 / svg.w, area.h / 3 / svg.h);
  const w = svg.w * scale;
  const h = svg.h * scale;
  return {
    id: makeId(10),
    kind: 'svg',
    opacity: 100,
    rotation: 0,
    markup: svg.markup,
    x: area.x + (area.w - w) / 2,
    y: area.y + (area.h - h) / 2,
    w,
    h,
    fills: {},
    strokes: {},
    fillOpacities: {},
    strokeOpacities: {},
    strokeScale: 100,
    outline: '#000000',
    outlineWidth: 0,
  };
};

export type SizedLayer = ImageLayer | ShapeLayer | SvgLayer;

export const isLineShape = (l: EditorLayer) => l.kind === 'shape' && isLine(l);

// keeps the centre where it is, lines keep their start and direction
export const sizeLayer = (l: SizedLayer, w: number, h: number): SizedLayer =>
  isLineShape(l)
    ? { ...l, w: Math.sign(l.w || 1) * w, h: Math.sign(l.h || 1) * h }
    : { ...l, x: l.x + (l.w - w) / 2, y: l.y + (l.h - h) / 2, w, h };

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
  if (l.kind === 'image' || l.kind === 'shape' || l.kind === 'svg') {
    return { ...l, w: l.w * factor, h: l.h * factor };
  }
  if (l.kind === 'text') {
    return { ...l, size: Math.max(6, Math.round(l.size * factor)) };
  }
  return l;
};

type Drag =
  | { mode: 'crop'; sx: number; sy: number }
  | { mode: 'cropMove'; sx: number; sy: number; rect: Rect }
  | { mode: 'draw'; id: string }
  | { mode: 'shape'; sx: number; sy: number; layer: ShapeLayer }
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
  shape: ShapeKind;
  onShapeCreated: (id: string) => void;
  zoom: EditorZoom;
  onZoom: (zoom: number) => void;
  fontsVersion: number;
  // undefined when the grid is off
  grid?: GridSpacing;
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
    shape,
    onShapeCreated,
    zoom,
    onZoom,
    fontsVersion,
    grid,
  } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<Guides>({});
  const [overCrop, setOverCrop] = useState(false);
  const [svgVersion, setSvgVersion] = useState(0);
  const [editingId, setEditingId] = useState<string>();
  const editingRef = useRef(editingId);
  editingRef.current = editingId;
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const area = tool === 'crop' ? fullRect(doc) : visibleRect(doc);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() =>
      setViewport({ w: el.clientWidth, h: el.clientHeight })
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // css pixels per image pixel
  const fit = viewport.w
    ? Math.min(1, viewport.w / area.w, viewport.h / area.h)
    : 1;
  const displayScale = zoom === 'fit' ? fit : zoom;
  const displayRef = useRef(displayScale);
  displayRef.current = displayScale;

  useEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }
    // react registers wheel listeners as passive, so preventDefault needs a native one
    const onWheel = (e: WheelEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        return;
      }
      e.preventDefault();
      onZoom(clamp(displayRef.current * Math.exp(-e.deltaY * 0.002), 0.05, 8));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const finishEditing = useCallback(() => {
    // clearing the text removes the layer, in the same undo step as the edit
    let emptied = false;
    onUpdate((current) => {
      const layers = current.layers.filter(
        (l) => !(l.id === editingRef.current && l.kind === 'text' && !l.text.trim())
      );
      emptied = layers.length !== current.layers.length;
      return emptied ? { ...current, layers } : current;
    });
    if (emptied) {
      onSelect(undefined);
    }
    onEnd();
    setEditingId(undefined);
  }, []);

  useEffect(() => {
    if (tool !== 'select' && editingId) {
      finishEditing();
    }
  }, [tool]);

  useEffect(() => {
    if (!editingId) {
      return;
    }
    // capture runs before the modal's Escape hotkey, which would close the editor
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.target === editorRef.current) {
        e.stopImmediatePropagation();
        finishEditing();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editingId]);

  useEffect(() => {
    loadSvgs(doc).then((changed) => changed && setSvgVersion((v) => v + 1));
  }, [doc]);

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
    const { xs, ys } = gridLines(area, drawnGrid(grid, scale));
    if ((xs.length || ys.length) && tool !== 'crop') {
      ctx.save();
      ctx.beginPath();
      for (const x of xs) {
        ctx.moveTo(x, area.y);
        ctx.lineTo(x, area.y + area.h);
      }
      for (const y of ys) {
        ctx.moveTo(area.x, y);
        ctx.lineTo(area.x + area.w, y);
      }
      // dark under light keeps the lines visible on any photo
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = scale;
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = '#FF2E93';
    ctx.lineWidth = scale;
    ctx.beginPath();
    if (guides.x !== undefined) {
      ctx.moveTo(guides.x, area.y);
      ctx.lineTo(guides.x, area.y + area.h);
    }
    if (guides.y !== undefined) {
      ctx.moveTo(area.x, guides.y);
      ctx.lineTo(area.x + area.w, guides.y);
    }
    ctx.stroke();
    ctx.restore();
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
  }, [doc, images, tool, selectedId, cropDraft, guides, displayScale, fontsVersion, svgVersion, grid]);

  const toPoint = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
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
        if (cropDraft && insideCrop(doc, cropDraft, p.x, p.y)) {
          drag.current = { mode: 'cropMove', sx: p.x, sy: p.y, rect: cropDraft };
          return;
        }
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
      if (tool === 'shape') {
        const layer = newShapeLayer(doc, shape, p.x, p.y);
        onBegin();
        onUpdate((d) => ({ ...d, layers: [...d.layers, layer] }));
        drag.current = { mode: 'shape', sx: p.x, sy: p.y, layer };
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
        .find((l) => hitsLayer(ctx, l, p.x, p.y, p.scale));
      onSelect(hit?.id);
      if (editingId && hit?.id !== editingId) {
        finishEditing();
      }
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
    [doc, tool, selectedId, editingId, drawColor, drawSize, shape, toPoint, cropDraft]
  );

  const pointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const d = drag.current;
      if (!d) {
        if (tool === 'crop') {
          const p = toPoint(e);
          setOverCrop(insideCrop(doc, cropDraft, p.x, p.y));
        }
        return;
      }
      const p = toPoint(e);
      if (d.mode === 'crop') {
        onCropDraft(cropFromDrag(doc, d.sx, d.sy, p.x, p.y, cropRatio));
        return;
      }
      if (d.mode === 'cropMove') {
        onCropDraft(movedCrop(doc, d.rect, p.x - d.sx, p.y - d.sy));
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
      if (d.mode === 'shape') {
        next = shapeFromDrag(d.layer, d.sx, d.sy, p.x, p.y, e.shiftKey);
      } else if (d.mode === 'move') {
        next = moveLayer(d.layer, dx, dy);
        // Alt moves freely
        if (!e.altKey) {
          const snapped = snapLayer(
            ref.current!.getContext('2d')!,
            next,
            snapTargets(area, drawnGrid(grid, p.scale)),
            8 * p.scale
          );
          next = snapped.layer;
          setGuides(snapped.guides);
        } else {
          setGuides({});
        }
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
        let along = local.x;
        // a turned corner does not run along the grid, so only straight layers snap
        if (!e.altKey && !d.layer.rotation) {
          const targets = snapTargets(area, drawnGrid(grid, p.scale));
          const tolerance = 8 * p.scale;
          // padding and rounded text sizes keep the edges from growing one for one with the drag
          const sized = (a: number) => layerBounds(ctx, resizeLayer(d.layer, d.bounds, a));
          const b = sized(along);
          const probe = sized(along + d.bounds.w);
          const gainX = (probe.w - b.w) / d.bounds.w;
          const gainY = (probe.h - b.h) / d.bounds.w;
          // the top-left stays put, and flat lines have a side that never moves
          const x = gainX > 0.01 ? closest([d.bounds.x + b.w], targets.xs, tolerance) : undefined;
          const y = gainY > 0.01 ? closest([d.bounds.y + b.h], targets.ys, tolerance) : undefined;
          // the corner moves on both axes at once, so follow the side nearer a line
          if (x && (!y || Math.abs(x.diff) <= Math.abs(y.diff))) {
            along += x.diff / gainX;
            setGuides({ x: x.at });
          } else if (y) {
            along += y.diff / gainY;
            setGuides({ y: y.at });
          } else {
            setGuides({});
          }
        } else {
          setGuides({});
        }
        const resized = resizeLayer(d.layer, d.bounds, along);
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
    [doc, cropRatio, area, toPoint, grid, tool, cropDraft]
  );

  const pointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    setGuides({});
    if (d?.mode === 'shape') {
      // a click without a drag places a default sized shape
      onUpdate((current) => ({
        ...current,
        layers: current.layers.map((l) => {
          if (l.id !== d.layer.id || l.kind !== 'shape' || Math.hypot(l.w, l.h) > 4) {
            return l;
          }
          const size = visibleRect(current).w / 4;
          return isLine(l)
            ? { ...l, w: size, h: 0 }
            : { ...l, x: l.x - size / 2, y: l.y - size / 2, w: size, h: size };
        }),
      }));
      onEnd();
      onShapeCreated(d.layer.id);
      return;
    }
    if (d && d.mode !== 'crop' && d.mode !== 'cropMove') {
      onEnd();
    }
  }, [onShapeCreated]);

  const doubleClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const ctx = ref.current?.getContext('2d');
      if (!ctx || tool !== 'select') {
        return;
      }
      const p = toPoint(e);
      const hit = [...doc.layers]
        .reverse()
        .find((l) => hitsLayer(ctx, l, p.x, p.y, p.scale));
      if (hit?.kind === 'text') {
        onSelect(hit.id);
        onBegin();
        setEditingId(hit.id);
      }
    },
    [doc, tool, toPoint]
  );

  const editing = doc.layers.find(
    (l): l is TextLayer => l.id === editingId && l.kind === 'text'
  );
  let editor: ReactNode = null;
  if (editing && ref.current) {
    const box = textBox(ref.current.getContext('2d')!, editing);
    const centre = centreOf(layerBounds(ref.current.getContext('2d')!, editing));
    const s = displayScale;
    editor = (
      <textarea
        ref={editorRef}
        autoFocus
        wrap="off"
        spellCheck={false}
        value={editing.text}
        onBlur={finishEditing}
        onChange={(e) => {
          const text = e.target.value;
          onUpdate((current) => ({
            ...current,
            layers: current.layers.map((l) =>
              l.id === editing.id ? { ...l, text } : l
            ),
          }));
        }}
        className="absolute p-0 m-0 border-0 outline-none resize-none overflow-hidden bg-transparent whitespace-pre"
        style={{
          left: (box.x - area.x) * s,
          top: (box.y - area.y) * s,
          // a little extra room so the caret does not wrap the last character
          width: box.w * s + 2,
          height: box.h * s,
          // the canvas draws the text, the field only shows the caret and selection
          color: 'transparent',
          caretColor: editing.color,
          font: fontString(editing, editing.size * s),
          lineHeight: 1.2,
          textAlign: editing.align,
          transformOrigin: `${(centre.x - box.x) * s}px ${(centre.y - box.y) * s}px`,
          transform: editing.rotation ? `rotate(${editing.rotation}deg)` : undefined,
        }}
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* absolute, so a zoomed canvas scrolls instead of widening the modal */}
      <div ref={scroller} className="absolute inset-0 overflow-auto flex">
        <div
          className="relative m-auto shrink-0"
          style={{ width: area.w * displayScale, height: area.h * displayScale }}
        >
          <canvas
            ref={ref}
            className="block w-full h-full touch-none select-none"
            style={{
              cursor:
                tool === 'select'
                  ? 'default'
                  : tool === 'crop' && overCrop
                  ? 'move'
                  : 'crosshair',
              background:
                'repeating-conic-gradient(#2a2a2a 0% 25%, #1f1f1f 0% 50%) 50% / 20px 20px',
            }}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={pointerUp}
            onPointerCancel={pointerUp}
            onDoubleClick={doubleClick}
          />
          {editor}
        </div>
      </div>
    </div>
  );
};
