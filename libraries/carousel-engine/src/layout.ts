import {
  STAGE_WIDTH,
  stageHeight,
  type AspectRatio,
  type BrandKit,
  type Carousel,
  type RichTextRun,
  type Slide,
  type SlideBackground,
  type TextNode,
  type ImageNode,
  type ShapeNode,
  type CarouselNode,
} from './schema';
import { templateSequence, type TemplateSlot } from './templates';

/**
 * layout.ts — resolve (briefing + conteúdo) → scene graph posicionado.
 *
 * Produz APENAS os nós editáveis (headline, body, imagens). A "chrome" repetida
 * — accent bar, brand bar, progress bar — é desenhada pelo renderer a partir de
 * slide.background + brand + índice, não vira nó editável (espelha a divisão
 * template-fixo / conteúdo-editável do Brands Decoded).
 */

/** Conteúdo estruturado de um slide (o que o Cedrico produz por slide). */
export interface SlideContent {
  /** Título interno do slide (h1). Marque palavras accent com <em>palavra</em>. */
  title?: string;
  body?: string;
  imageUrl?: string;
  /**
   * Itens da diagramação 'list' (Fase 1 — vocabulário de slide nº3). Cada string
   * é uma linha/ponto da lista. Quando ausente e `layout === 'list'`, o conteúdo
   * é derivado quebrando `body` por linha (\n) — ver `setSlideLayout`.
   */
  items?: string[];
}

/** Conteúdo de um carrossel inteiro vindo do agente / do autofill. */
export interface CarouselContent {
  /** Headline (primário) da capa (uppercase, <em> nas palavras-chave). */
  headline: string;
  /** Subtítulo (secundário) da capa. */
  headlineSecondary?: string;
  coverImageUrl?: string;
  /** Um item por slide interno (entre capa e CTA): title=primário, body=secundário. */
  slides: SlideContent[];
  /** Título (primário) do slide de CTA. */
  cta: string;
  /** Corpo (secundário) do slide de CTA — a frase-ponte + chamada à ação. */
  ctaSecondary?: string;
}

const MARGIN_X = 80; // área safe horizontal (52–80px no Brands Decoded)
const CONTENT_WIDTH = STAGE_WIDTH - MARGIN_X * 2;

let nodeSeq = 0;
function nid(prefix: string): string {
  nodeSeq += 1;
  return `${prefix}-${nodeSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Converte texto com marcação <em>…</em> em runs de texto rico, onde o conteúdo
 * marcado recebe a cor accent da marca (o "word-level styling" do Brands Decoded).
 */
export function parseRuns(text: string, accentColor: string): RichTextRun[] {
  if (!text) return [{ text: '' }];
  const runs: RichTextRun[] = [];
  const regex = /<em>(.*?)<\/em>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    runs.push({ text: m[1], color: accentColor, bold: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length ? runs : [{ text }];
}

function textColorFor(bg: SlideBackground['kind'], brand: BrandKit): string {
  return bg === 'light' ? brand.bgDark : '#FFFFFF';
}

function backgroundFor(slot: TemplateSlot, brand: BrandKit, imageUrl?: string): SlideBackground {
  switch (slot.kind) {
    case 'image':
      return { kind: 'image', imageUrl, overlay: 0.55 };
    case 'light':
      return { kind: 'light', color: brand.bgLight };
    case 'dark':
      return { kind: 'dark', color: brand.bgDark };
    case 'grad':
      return { kind: 'grad' };
  }
}

function coverNodes(content: CarouselContent, brand: BrandKit, ratio: AspectRatio): CarouselNode[] {
  const h = stageHeight(ratio);
  const hasSub = !!content.headlineSecondary?.trim();
  // com subtítulo, sobe a headline para abrir espaço abaixo dela
  const headlineY = hasSub ? h - 600 : h - 520;
  const headline: TextNode = {
    id: nid('cover-headline'),
    kind: 'text',
    x: MARGIN_X,
    y: headlineY,
    width: CONTENT_WIDTH,
    runs: parseRuns(content.headline.toUpperCase(), brand.primary),
    fontFamily: brand.fontHeadline,
    fontSize: 96,
    fontWeight: 800,
    lineHeight: 1.02,
    letterSpacing: -3,
    align: 'left',
    fill: '#FFFFFF',
    uppercase: true,
    draggable: true,
    visible: true,
  };
  const nodes: CarouselNode[] = [headline];
  if (hasSub) {
    nodes.push({
      id: nid('cover-subtitle'),
      kind: 'text',
      x: MARGIN_X,
      y: h - 240,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.headlineSecondary as string, brand.primary),
      fontFamily: brand.fontBody,
      fontSize: 42,
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: 0,
      align: 'left',
      fill: 'rgba(255,255,255,0.88)',
      draggable: true,
      visible: true,
    });
  }
  return nodes;
}

/**
 * "Big Stat" — vocabulário de slide nº1 (Fase 1). Número gigante (content.title,
 * ex: "73%") + label abaixo (content.body). Specs exatas: volatis-design-system.md
 * § SLIDE INTERNO — DARK, .dark-big-stat / .dark-stat-label.
 */
function statSlideNodes(
  content: SlideContent | undefined,
  brand: BrandKit,
  slot: TemplateSlot
): CarouselNode[] {
  if (!content?.title) return [];
  const nodes: CarouselNode[] = [];
  const isLight = slot.kind === 'light';
  const labelFill = isLight ? 'rgba(15,13,12,0.45)' : 'rgba(255,255,255,0.35)';

  nodes.push({
    id: nid('stat-number'),
    kind: 'text',
    x: MARGIN_X,
    y: 760,
    width: CONTENT_WIDTH,
    runs: [{ text: content.title }],
    fontFamily: brand.fontHeadline,
    fontSize: 200,
    fontWeight: 900,
    lineHeight: 1.0,
    letterSpacing: -8,
    align: 'left',
    fill: brand.primary,
    draggable: true,
    visible: true,
  });

  if (content.body) {
    nodes.push({
      id: nid('stat-label'),
      kind: 'text',
      x: MARGIN_X,
      y: 980,
      width: CONTENT_WIDTH,
      runs: [{ text: content.body }],
      fontFamily: brand.fontBody,
      fontSize: 30,
      fontWeight: 500,
      lineHeight: 1.3,
      letterSpacing: 0,
      align: 'left',
      fill: labelFill,
      draggable: true,
      visible: true,
    });
  }

  return nodes;
}

/**
 * "Card destaque" — vocabulário de slide nº2 (Fase 1). Título+corpo dentro de
 * uma caixa com fundo translúcido (dark) ou branco (light) e borda esquerda
 * de acento. Specs exatas: volatis-design-system.md § .dark-card / .light-card.
 */
function cardSlideNodes(
  content: SlideContent | undefined,
  brand: BrandKit,
  slot: TemplateSlot,
  ratio: AspectRatio
): CarouselNode[] {
  if (!content?.title && !content?.body) return [];
  const isLight = slot.kind === 'light';
  const h = stageHeight(ratio);

  const padX = isLight ? 56 : 48;
  const padY = isLight ? 52 : 44;
  const borderW = isLight ? 7 : 6;
  const cornerRadius = isLight ? 18 : 16;
  const cardWidth = CONTENT_WIDTH;
  const innerWidth = cardWidth - padX * 2;

  const titleSize = isLight ? 56 : 60;
  const bodySize = 34;
  const titleLines = content?.title ? Math.ceil(content.title.length / 18) : 0;
  const titleH = content?.title ? titleLines * titleSize * 1.05 + 28 : 0;
  const bodyLines = content?.body ? Math.ceil(content.body.length / 32) : 0;
  const bodyH = content?.body ? bodyLines * bodySize * 1.45 : 0;
  const cardHeight = padY * 2 + titleH + bodyH;

  const cardY = Math.max(280, (h - cardHeight) / 2);

  const nodes: CarouselNode[] = [];

  const card: ShapeNode = {
    id: nid('card'),
    kind: 'shape',
    x: MARGIN_X,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    fill: isLight ? '#FFFFFF' : 'rgba(255,255,255,0.04)',
    cornerRadius,
    borderLeftColor: brand.primary,
    borderLeftWidth: borderW,
    draggable: true,
    visible: true,
  };
  nodes.push(card);

  let cursorY = cardY + padY;

  if (content?.title) {
    nodes.push({
      id: nid('card-title'),
      kind: 'text',
      x: MARGIN_X + padX,
      y: cursorY,
      width: innerWidth,
      runs: parseRuns(content.title, brand.primary),
      fontFamily: brand.fontHeadline,
      fontSize: titleSize,
      fontWeight: 900,
      lineHeight: 1.05,
      letterSpacing: -1.5,
      align: 'left',
      fill: isLight ? brand.bgDark : '#FFFFFF',
      uppercase: true,
      draggable: true,
      visible: true,
    });
    cursorY += titleH;
  }

  if (content?.body) {
    nodes.push({
      id: nid('card-body'),
      kind: 'text',
      x: MARGIN_X + padX,
      y: cursorY,
      width: innerWidth,
      runs: parseRuns(content.body, brand.primary),
      fontFamily: brand.fontBody,
      fontSize: bodySize,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: 0,
      align: 'left',
      fill: isLight ? brand.bgDark : 'rgba(255,255,255,0.85)',
      draggable: true,
      visible: true,
    });
  }

  return nodes;
}

/** Quebra um corpo em itens de lista/linhas de tabela (uma por linha ou ';'). */
function splitItems(text?: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
}

/** Cabeçalho opcional reaproveitado por lista/tabela/img-box (título do slide). */
function headingNode(
  title: string,
  brand: BrandKit,
  isLight: boolean,
  y: number,
  size = 0
): { node: TextNode; height: number } {
  const fontSize = size || (isLight ? 56 : 60);
  const lines = Math.ceil(title.length / 18) || 1;
  const node: TextNode = {
    id: nid('heading'),
    kind: 'text',
    x: MARGIN_X,
    y,
    width: CONTENT_WIDTH,
    runs: parseRuns(title, brand.primary),
    fontFamily: brand.fontHeadline,
    fontSize,
    fontWeight: 800,
    lineHeight: 1.05,
    letterSpacing: -1.5,
    align: 'left',
    fill: isLight ? brand.bgDark : '#FFFFFF',
    uppercase: true,
    draggable: true,
    visible: true,
  };
  return { node, height: lines * fontSize * 1.05 + 44 };
}

/**
 * "Lista/Pattern" — vocabulário nº3 (Fase 1). Em light: cards numerados
 * (.light-pcard + .light-pnum + .light-ptitle). Em dark/grad: linhas com seta →
 * (.dark-arrow-row / .grad-row). Itens vêm das linhas do corpo (uma por linha/';').
 */
function listSlideNodes(
  content: SlideContent | undefined,
  brand: BrandKit,
  slot: TemplateSlot
): CarouselNode[] {
  const items = splitItems(content?.body).slice(0, 5);
  if (!content?.title && items.length === 0) return [];
  const isLight = slot.kind === 'light';
  const nodes: CarouselNode[] = [];
  let cursorY = 300;

  if (content?.title) {
    const { node, height } = headingNode(content.title, brand, isLight, cursorY);
    nodes.push(node);
    cursorY += height;
  }

  if (isLight) {
    const padX = 48;
    const padY = 40;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const lines = Math.ceil(item.length / 36) || 1;
      const ptitleH = lines * 30 * 1.3;
      const cardH = padY * 2 + 30 + ptitleH;
      nodes.push({
        id: nid('pcard'),
        kind: 'shape',
        x: MARGIN_X,
        y: cursorY,
        width: CONTENT_WIDTH,
        height: cardH,
        fill: '#FFFFFF',
        cornerRadius: 18,
        stroke: 'rgba(15,13,12,0.10)',
        strokeWidth: 1.5,
        draggable: true,
        visible: true,
      });
      nodes.push({
        id: nid('pnum'),
        kind: 'text',
        x: MARGIN_X + padX,
        y: cursorY + padY,
        width: CONTENT_WIDTH - padX * 2,
        runs: [{ text: String(i + 1).padStart(2, '0') }],
        fontFamily: brand.fontBody,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: 3,
        align: 'left',
        fill: brand.primary,
        uppercase: true,
        draggable: true,
        visible: true,
      });
      nodes.push({
        id: nid('ptitle'),
        kind: 'text',
        x: MARGIN_X + padX,
        y: cursorY + padY + 30,
        width: CONTENT_WIDTH - padX * 2,
        runs: parseRuns(item, brand.primary),
        fontFamily: brand.fontBody,
        fontSize: 30,
        fontWeight: 800,
        lineHeight: 1.3,
        letterSpacing: -0.3,
        align: 'left',
        fill: brand.bgDark,
        draggable: true,
        visible: true,
      });
      cursorY += cardH + 20;
    }
  } else {
    const arrowColor = slot.kind === 'grad' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)';
    const textColor = slot.kind === 'grad' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.55)';
    const fs = slot.kind === 'grad' ? 32 : 38;
    for (const item of items) {
      const lines = Math.ceil(item.length / 34) || 1;
      nodes.push({
        id: nid('arrow-row'),
        kind: 'text',
        x: MARGIN_X,
        y: cursorY,
        width: CONTENT_WIDTH,
        runs: [{ text: '→  ', color: arrowColor, bold: true }, ...parseRuns(item, brand.primary)],
        fontFamily: brand.fontBody,
        fontSize: fs,
        fontWeight: 500,
        lineHeight: 1.45,
        letterSpacing: -0.2,
        align: 'left',
        fill: textColor,
        draggable: true,
        visible: true,
      });
      cursorY += lines * fs * 1.45 + 28;
    }
  }

  return nodes;
}

/**
 * "Tabela" — vocabulário nº4 (Fase 1). Estilo .light-table: header com fundo
 * accent (th) + linhas de dados (td) com borda inferior. Cada linha do corpo é
 * "coluna A | coluna B"; a primeira linha é o cabeçalho.
 */
function tableSlideNodes(
  content: SlideContent | undefined,
  brand: BrandKit,
  slot: TemplateSlot
): CarouselNode[] {
  const rows = splitItems(content?.body)
    .map((line) => line.split('|').map((c) => c.trim()))
    .slice(0, 7);
  if (!content?.title && rows.length === 0) return [];
  const isLight = slot.kind === 'light';
  const nodes: CarouselNode[] = [];
  let cursorY = 300;

  if (content?.title) {
    const { node, height } = headingNode(content.title, brand, isLight, cursorY);
    nodes.push(node);
    cursorY += height;
  }

  const tableW = CONTENT_WIDTH;
  const cellPad = 24;
  const col1X = MARGIN_X + cellPad;
  const splitRatio = 0.55;
  const col2X = MARGIN_X + tableW * splitRatio + cellPad;
  const col1W = tableW * splitRatio - cellPad * 2;
  const col2W = tableW * (1 - splitRatio) - cellPad * 2;

  const cellText = (
    text: string,
    x: number,
    w: number,
    y: number,
    opts: { header?: boolean }
  ): TextNode => ({
    id: nid('cell'),
    kind: 'text',
    x,
    y,
    width: w,
    runs: opts.header ? [{ text: text.toUpperCase() }] : parseRuns(text, brand.primary),
    fontFamily: brand.fontBody,
    fontSize: opts.header ? 16 : 26,
    fontWeight: opts.header ? 700 : 500,
    lineHeight: 1.2,
    letterSpacing: opts.header ? 2 : 0,
    align: 'left',
    fill: opts.header ? '#FFFFFF' : isLight ? brand.bgDark : '#FFFFFF',
    draggable: true,
    visible: true,
  });

  const header = rows[0] ?? [];
  const dataRows = rows.slice(1);
  const headerH = 64;

  // fundo do cabeçalho (accent)
  nodes.push({
    id: nid('th-bg'),
    kind: 'shape',
    x: MARGIN_X,
    y: cursorY,
    width: tableW,
    height: headerH,
    fill: brand.primary,
    cornerRadius: 0,
    draggable: true,
    visible: true,
  });
  nodes.push(cellText(header[0] ?? '', col1X, col1W, cursorY + 22, { header: true }));
  if (header[1] !== undefined) nodes.push(cellText(header[1], col2X, col2W, cursorY + 22, { header: true }));
  cursorY += headerH;

  const rowH = 72;
  const borderColor = isLight ? 'rgba(15,13,12,0.10)' : 'rgba(255,255,255,0.12)';
  for (const row of dataRows) {
    nodes.push(cellText(row[0] ?? '', col1X, col1W, cursorY + 24, {}));
    if (row[1] !== undefined) nodes.push(cellText(row[1], col2X, col2W, cursorY + 24, {}));
    nodes.push({
      id: nid('tr-border'),
      kind: 'shape',
      x: MARGIN_X,
      y: cursorY + rowH - 1,
      width: tableW,
      height: 1,
      fill: borderColor,
      draggable: false,
      visible: true,
    });
    cursorY += rowH;
  }

  return nodes;
}

/**
 * "Img-box" — vocabulário nº5 (Fase 1). Caixa de imagem no topo (.img-box) +
 * título/corpo abaixo. Sem imagem ainda, mostra um placeholder (ShapeNode) para o
 * usuário ver onde a foto entra (sobe pelo painel Mídia).
 */
function imgBoxSlideNodes(
  content: SlideContent | undefined,
  brand: BrandKit,
  slot: TemplateSlot
): CarouselNode[] {
  const isLight = slot.kind === 'light';
  const nodes: CarouselNode[] = [];
  const boxY = 240;
  const boxH = 420;

  if (content?.imageUrl) {
    nodes.push({
      id: nid('imgbox'),
      kind: 'image',
      x: MARGIN_X,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxH,
      src: content.imageUrl,
      objectFit: 'cover',
      cornerRadius: 20,
      draggable: true,
      visible: true,
    });
  } else {
    nodes.push({
      id: nid('imgbox-ph'),
      kind: 'shape',
      x: MARGIN_X,
      y: boxY,
      width: CONTENT_WIDTH,
      height: boxH,
      fill: isLight ? 'rgba(15,13,12,0.04)' : 'rgba(255,255,255,0.04)',
      cornerRadius: 20,
      stroke: isLight ? 'rgba(15,13,12,0.12)' : 'rgba(255,255,255,0.12)',
      strokeWidth: 1.5,
      draggable: true,
      visible: true,
    });
  }

  let cursorY = boxY + boxH + 44;
  if (content?.title) {
    nodes.push({
      id: nid('imgbox-title'),
      kind: 'text',
      x: MARGIN_X,
      y: cursorY,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.title, brand.primary),
      fontFamily: brand.fontHeadline,
      fontSize: 60,
      fontWeight: 800,
      lineHeight: 1.0,
      letterSpacing: -1.5,
      align: 'left',
      fill: isLight ? brand.bgDark : '#FFFFFF',
      uppercase: true,
      draggable: true,
      visible: true,
    });
    cursorY += (Math.ceil(content.title.length / 22) || 1) * 60 + 28;
  }
  if (content?.body) {
    nodes.push({
      id: nid('imgbox-body'),
      kind: 'text',
      x: MARGIN_X,
      y: cursorY,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.body, brand.primary),
      fontFamily: brand.fontBody,
      fontSize: 36,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: 0,
      align: 'left',
      fill: isLight ? 'rgba(15,13,12,0.60)' : 'rgba(255,255,255,0.7)',
      draggable: true,
      visible: true,
    });
  }

  return nodes;
}

/**
 * Recalcula os nós de um slide interno para um `layout` específico, dado um
 * `TemplateSlot` (kind do fundo) + conteúdo. Usado pelo editor ao trocar a
 * diagramação de um slide já existente (ex: aplicar 'stat' a um slide 'default').
 */
export function bodySlideNodes(
  slot: TemplateSlot,
  content: SlideContent | undefined,
  brand: BrandKit,
  ratio: AspectRatio,
  layout: Slide['layout'] = 'default'
): CarouselNode[] {
  if (layout === 'stat') {
    return statSlideNodes(content, brand, slot);
  }
  if (layout === 'card') {
    return cardSlideNodes(content, brand, slot, ratio);
  }
  if (layout === 'list') {
    return listSlideNodes(content, brand, slot);
  }
  if (layout === 'table') {
    return tableSlideNodes(content, brand, slot);
  }
  if (layout === 'img-box') {
    return imgBoxSlideNodes(content, brand, slot);
  }

  const fill = textColorFor(slot.kind, brand);
  const nodes: CarouselNode[] = [];
  let cursorY = 320;

  if (content?.imageUrl) {
    const img: ImageNode = {
      id: nid('img'),
      kind: 'image',
      x: MARGIN_X,
      y: 200,
      width: CONTENT_WIDTH,
      height: 420,
      src: content.imageUrl,
      objectFit: 'cover',
      cornerRadius: 18,
      draggable: true,
      visible: true,
    };
    nodes.push(img);
    cursorY = 680;
  }

  if (content?.title) {
    nodes.push({
      id: nid('title'),
      kind: 'text',
      x: MARGIN_X,
      y: cursorY,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.title, brand.primary),
      fontFamily: brand.fontHeadline,
      // tamanhos da BD: dark 80, light 72, gradient 84 (eram 60 — visual pobre)
      fontSize: slot.kind === 'grad' ? 84 : slot.kind === 'dark' ? 80 : 72,
      fontWeight: 800,
      lineHeight: 1.0,
      letterSpacing: slot.kind === 'light' ? -1.5 : -2,
      align: 'left',
      fill: slot.kind === 'grad' ? '#FFFFFF' : fill,
      uppercase: true,
      draggable: true,
      visible: true,
    });
    cursorY += 250;
  }

  if (content?.body) {
    nodes.push({
      id: nid('body'),
      kind: 'text',
      x: MARGIN_X,
      y: cursorY,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.body, brand.primary),
      fontFamily: brand.fontBody,
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: 0,
      align: 'left',
      fill,
      draggable: true,
      visible: true,
    });
  }

  return nodes;
}

/**
 * Envolve a última frase de um texto em <em> (vira accent+bold no render),
 * dando destaque à chamada à ação dentro do corpo do CTA. Respeita marcação
 * <em> já existente — se o autor/GPT marcou algo, não sobrescreve.
 */
function emphasizeLastSentence(text: string): string {
  if (!text || /<em>/i.test(text)) return text;
  const parts = text.trim().split(/(?<=[.!?])\s+/);
  if (parts.length < 2) return text;
  const last = parts.pop() as string;
  return `${parts.join(' ')} <em>${last}</em>`;
}

function ctaNodes(content: CarouselContent, brand: BrandKit): CarouselNode[] {
  const hasBody = !!content.ctaSecondary?.trim();
  const nodes: CarouselNode[] = [
    {
      id: nid('cta'),
      kind: 'text',
      x: MARGIN_X,
      y: hasBody ? 380 : 520,
      width: CONTENT_WIDTH,
      runs: parseRuns(content.cta, brand.primary),
      fontFamily: brand.fontHeadline,
      fontSize: 64,
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: -1,
      align: 'left',
      fill: brand.bgDark,
      draggable: true,
      visible: true,
    },
  ];
  if (hasBody) {
    nodes.push({
      id: nid('cta-body'),
      kind: 'text',
      x: MARGIN_X,
      y: 600,
      width: CONTENT_WIDTH,
      runs: parseRuns(emphasizeLastSentence(content.ctaSecondary as string), brand.primary),
      fontFamily: brand.fontBody,
      fontSize: 40,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: 0,
      align: 'left',
      fill: brand.bgDark,
      draggable: true,
      visible: true,
    });
  }
  return nodes;
}

/**
 * Monta um Carousel completo a partir do kit de marca + conteúdo estruturado.
 * É a função que o editor chama ao receber a saída do Cedrico (ou o mock/seed).
 */
export function buildCarousel(params: {
  id: string;
  title?: string;
  crmClientId?: string | null;
  aspectRatio?: AspectRatio;
  brand: BrandKit;
  content: CarouselContent;
  /** Sequência de slots a usar (ex: de um template nomeado). Default: por contagem. */
  sequence?: TemplateSlot[];
}): Carousel {
  const ratio = params.aspectRatio ?? '4:5';
  const totalSlides = params.content.slides.length + 2; // capa + internos + CTA
  const sequence = params.sequence ?? templateSequence(totalSlides);

  const slides: Slide[] = sequence.map((slot, i) => {
    let nodes: CarouselNode[];
    let bg: SlideBackground;
    // diagramação do slot (templates nomeados trazem layout por slide; default = 'default')
    const slotLayout = slot.layout ?? 'default';

    if (slot.role === 'cover') {
      bg = backgroundFor(slot, params.brand, params.content.coverImageUrl);
      nodes = coverNodes(params.content, params.brand, ratio);
    } else if (slot.role === 'cta') {
      bg = backgroundFor(slot, params.brand);
      nodes = ctaNodes(params.content, params.brand);
    } else {
      // internos: índice 1..N-2 mapeia para content.slides[i-1]
      const inner = params.content.slides[i - 1];
      bg = backgroundFor(slot, params.brand, inner?.imageUrl);
      nodes = bodySlideNodes(slot, inner, params.brand, ratio, slotLayout);
    }

    return {
      id: nid('slide'),
      role: slot.role,
      tag: slot.tag || undefined,
      layout: slot.role === 'cover' || slot.role === 'cta' ? 'default' : slotLayout,
      background: bg,
      nodes,
    };
  });

  const now = new Date().toISOString();
  return {
    id: params.id,
    version: 1,
    title: params.title ?? 'Sem título',
    crmClientId: params.crmClientId ?? null,
    aspectRatio: ratio,
    brand: params.brand,
    slides,
    createdAt: now,
    updatedAt: now,
  };
}
