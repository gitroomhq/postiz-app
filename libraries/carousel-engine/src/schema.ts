import { z } from 'zod';

/**
 * Carousel Engine — Schema (o contrato)
 *
 * Um carrossel é JSON. O Konva apenas renderiza esse JSON, o backend apenas o
 * persiste, e o agente Cedrico apenas o EMITE. Este arquivo é a fonte única de
 * verdade da estrutura de dados — tudo o mais (layout, render, export, IA)
 * deriva daqui.
 *
 * Dimensões nativas (Brands Decoded / análise técnica):
 *   4:5  → 1080 × 1350
 *   9:16 → 1080 × 1920 (expande o fundo verticalmente, conteúdo não reposiciona)
 */

export const STAGE_WIDTH = 1080;
export const STAGE_HEIGHT_4_5 = 1350;
export const STAGE_HEIGHT_9_16 = 1920;

export const THUMB_WIDTH = 221;
export const THUMB_HEIGHT = 276; // 221 × (1350/1080)

export const aspectRatioSchema = z.enum(['4:5', '9:16']);
export type AspectRatio = z.infer<typeof aspectRatioSchema>;

export function stageHeight(ratio: AspectRatio): number {
  return ratio === '9:16' ? STAGE_HEIGHT_9_16 : STAGE_HEIGHT_4_5;
}

/** Papel narrativo do slide dentro do arco (Bloco 6 do system-prompt Cedrico). */
export const slideRoleSchema = z.enum([
  'cover', // capa
  'hook',
  'context',
  'mechanism',
  'proof',
  'expansion',
  'application',
  'direction', // slide gradient (penúltimo)
  'cta',
]);
export type SlideRole = z.infer<typeof slideRoleSchema>;

/** Tom de fundo do slide. 'image' = foto full-bleed (capa). */
export const backgroundKindSchema = z.enum(['light', 'dark', 'grad', 'image']);
export type BackgroundKind = z.infer<typeof backgroundKindSchema>;

export const slideBackgroundSchema = z.object({
  kind: backgroundKindSchema,
  /** Cor sólida (light/dark). Ignorado em 'grad' e 'image'. */
  color: z.string().optional(),
  /** URL/base64 da mídia (image). */
  imageUrl: z.string().optional(),
  /** Overlay escuro 0..1 sobre a imagem para garantir contraste 4.5:1. */
  overlay: z.number().min(0).max(1).optional(),
});
export type SlideBackground = z.infer<typeof slideBackgroundSchema>;

/**
 * Run de texto rico — a unidade do "word-level styling" (o diferencial de UX
 * do Brands Decoded). Cada palavra/trecho pode ter cor, peso e highlight
 * próprios dentro de um mesmo nó de texto.
 */
export const richTextRunSchema = z.object({
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  /** Cor accent da palavra (sobrepõe o fill do nó). */
  color: z.string().optional(),
  /** Caixa colorida atrás da palavra. */
  highlight: z.string().optional(),
  uppercase: z.boolean().optional(),
});
export type RichTextRun = z.infer<typeof richTextRunSchema>;

const baseNode = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  /** Largura da caixa (texto quebra dentro dela). */
  width: z.number(),
  rotation: z.number().optional(),
  draggable: z.boolean().optional().default(true),
  /** Token global que alimenta este nó (brand-name, handle, copyright...). */
  bind: z.string().optional(),
  visible: z.boolean().optional().default(true),
});

export const textNodeSchema = baseNode.extend({
  kind: z.literal('text'),
  runs: z.array(richTextRunSchema),
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.number().default(400),
  lineHeight: z.number().default(1.2),
  letterSpacing: z.number().default(0),
  align: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  /** Itálico do nó inteiro (runs herdam). */
  italic: z.boolean().optional(),
  /** Cor padrão do texto (runs podem sobrepor). */
  fill: z.string(),
  uppercase: z.boolean().optional(),
});
export type TextNode = z.infer<typeof textNodeSchema>;

export const imageNodeSchema = baseNode.extend({
  kind: z.literal('image'),
  height: z.number(),
  src: z.string(),
  objectFit: z.enum(['cover', 'contain']).default('cover'),
  cornerRadius: z.number().optional(),
});
export type ImageNode = z.infer<typeof imageNodeSchema>;

/**
 * Nó retangular (caixas/cards). Fundação para os próximos tipos de slide —
 * "card destaque" (.dark-card: fundo translúcido + border-left de acento),
 * tabelas e img-box. O Big Stat (Fase 1) não usa ShapeNode (é só 2 textos).
 */
export const shapeNodeSchema = baseNode.extend({
  kind: z.literal('shape'),
  height: z.number(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  cornerRadius: z.number().optional(),
  /** Borda esquerda de acento (ex: .dark-card border-left: 6px solid var(--P)). */
  borderLeftColor: z.string().optional(),
  borderLeftWidth: z.number().optional(),
});
export type ShapeNode = z.infer<typeof shapeNodeSchema>;

export const nodeSchema = z.discriminatedUnion('kind', [
  textNodeSchema,
  imageNodeSchema,
  shapeNodeSchema,
]);
export type CarouselNode = z.infer<typeof nodeSchema>;

/**
 * Vocabulário de slides (Fase 1 da dinâmica de templates). Controla qual
 * função de layout em layout.ts monta os nós editáveis do slide.
 * 'default' = título+corpo padrão (comportamento atual, sem mudança).
 */
export const slideLayoutSchema = z.enum([
  'default',
  'stat',
  'card',
  'list',
  'table',
  'img-box',
]);
export type SlideLayout = z.infer<typeof slideLayoutSchema>;

export const slideSchema = z.object({
  id: z.string(),
  role: slideRoleSchema,
  /** Tag/label do topo do slide (ex: "HOOK", "PROVA"). */
  tag: z.string().optional(),
  /** Vocabulário de slide (Fase 1): qual layout monta os nós deste slide. */
  layout: slideLayoutSchema.optional().default('default'),
  background: slideBackgroundSchema,
  nodes: z.array(nodeSchema),
  /**
   * Override por slide da identidade da marca (avatar + nome + @handle +
   * copyright). `undefined` herda a visibilidade global do BrandKit; `true`
   * oculta os campos globais SÓ neste slide (a estrutura — accent bar, progresso,
   * paginação — permanece).
   */
  hideBrandFields: z.boolean().optional(),
  /** Oculta o rodapé (barra de progresso + paginação N/total) só neste slide. */
  hideFooter: z.boolean().optional(),
  /** Oculta o número decorativo gigante de fundo (slides dark) só neste slide. */
  hideBgNumber: z.boolean().optional(),
});
export type Slide = z.infer<typeof slideSchema>;

/** Estilo visual escolhido no briefing (define pareamento de fontes). */
export const visualStyleSchema = z.enum([
  'classic',
  'modern',
  'minimal',
  'bold',
]);
export type VisualStyle = z.infer<typeof visualStyleSchema>;

/**
 * Kit de marca — variáveis globais propagadas por todos os slides (os "Campos
 * Globais" do Brands Decoded) + a paleta derivada do nicho/cor.
 */
export const brandKitSchema = z.object({
  brandName: z.string().default(''),
  handle: z.string().default(''),
  copyright: z.string().default(''),
  avatarUrl: z.string().optional(),
  /** Visibilidade dos campos globais no rodapé dos frames (default: visível). */
  showBrandName: z.boolean().optional(),
  showHandle: z.boolean().optional(),
  showCopyright: z.boolean().optional(),
  showAvatar: z.boolean().optional(),

  primary: z.string(), // cor accent da marca (palavras destacadas)
  accent: z.string(),
  bgLight: z.string(),
  bgDark: z.string(),
  /** Gradiente do slide 'grad'. */
  gradient: z.array(z.string()).min(2),
  /** Cor sólida da barra de topo de todos os frames (definida pelo usuário). */
  accentBar: z.string().optional(),

  fontHeadline: z.string(),
  fontBody: z.string(),
  visualStyle: visualStyleSchema.default('modern'),
});
export type BrandKit = z.infer<typeof brandKitSchema>;

export const carouselSchema = z.object({
  id: z.string(),
  version: z.literal(1).default(1),
  title: z.string().default('Sem título'),
  /** Cliente do CRM dono deste carrossel (per-client channels da Fase 3) = a Marca. */
  crmClientId: z.string().nullable().optional(),
  /**
   * Expert (voz/autor) atribuído a este carrossel — opcional. N:N marca↔expert
   * (decisão Felipe 2026-06-19): um expert pode atuar em várias marcas. Alimenta
   * o "DNA do Projeto" exportado para o GPT (tom de voz/autoridade do expert).
   */
  expertId: z.string().nullable().optional(),
  /**
   * Projeto (marca/campanha) do CRM atribuído a este carrossel — opcional. Um
   * cliente pode ter vários projetos; o escolhido alimenta a seção "Marca" do
   * "DNA do Projeto" exportado para o GPT (nicho/persona/tom/produtos/CTAs).
   */
  projectId: z.string().nullable().optional(),
  aspectRatio: aspectRatioSchema.default('4:5'),
  brand: brandKitSchema,
  /** Botão de CTA (pill) exibido no rodapé dos frames quando ativo. */
  ctaButton: z
    .object({
      show: z.boolean().default(false),
      label: z.string().default('Comenta GUIA'),
    })
    .optional(),
  slides: z.array(slideSchema),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Carousel = z.infer<typeof carouselSchema>;

/** Valida e normaliza um documento vindo do localStorage / Cedrico / backend. */
export function parseCarousel(input: unknown): Carousel {
  return carouselSchema.parse(input);
}

export function safeParseCarousel(input: unknown) {
  return carouselSchema.safeParse(input);
}
