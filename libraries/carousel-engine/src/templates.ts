import type { BackgroundKind, SlideLayout, SlideRole } from './schema';

/**
 * Template único — ALTERNADO CLARO/ESCURO (Bloco 6 do system-prompt Cedrico).
 * Cada entrada descreve o fundo + papel narrativo + tag default de um slide.
 * As sequências se adaptam ao número de slides escolhido no briefing (5/7/9/12).
 */
export interface TemplateSlot {
  kind: BackgroundKind;
  role: SlideRole;
  tag: string;
  /** Diagramação (vocabulário Fase 1) deste slide. Default: 'default'. */
  layout?: SlideLayout;
}

const COVER: TemplateSlot = { kind: 'image', role: 'cover', tag: '' };
const GRAD: TemplateSlot = { kind: 'grad', role: 'direction', tag: '' };
const CTA_LIGHT: TemplateSlot = { kind: 'light', role: 'cta', tag: '' };

export const SEQUENCES: Record<number, TemplateSlot[]> = {
  5: [
    COVER,
    { kind: 'dark', role: 'hook', tag: 'HOOK' },
    { kind: 'light', role: 'proof', tag: 'PROVA' },
    { kind: 'dark', role: 'application', tag: 'APLICAÇÃO' },
    CTA_LIGHT,
  ],
  7: [
    COVER,
    { kind: 'dark', role: 'hook', tag: 'HOOK' },
    { kind: 'light', role: 'mechanism', tag: 'MECANISMO' },
    { kind: 'dark', role: 'proof', tag: 'PROVA' },
    { kind: 'light', role: 'expansion', tag: 'EXPANSÃO' },
    GRAD,
    CTA_LIGHT,
  ],
  9: [
    COVER,
    { kind: 'dark', role: 'hook', tag: 'HOOK' },
    { kind: 'light', role: 'context', tag: 'CONTEXTO' },
    { kind: 'dark', role: 'mechanism', tag: 'MECANISMO' },
    { kind: 'light', role: 'proof', tag: 'PROVA' },
    { kind: 'dark', role: 'expansion', tag: 'EXPANSÃO' },
    { kind: 'light', role: 'application', tag: 'APLICAÇÃO' },
    GRAD,
    CTA_LIGHT,
  ],
  12: [
    COVER,
    { kind: 'dark', role: 'hook', tag: 'HOOK' },
    { kind: 'light', role: 'context', tag: 'CONTEXTO' },
    { kind: 'dark', role: 'mechanism', tag: 'MECANISMO' },
    { kind: 'light', role: 'mechanism', tag: 'MECANISMO' },
    { kind: 'dark', role: 'proof', tag: 'PROVA' },
    { kind: 'light', role: 'proof', tag: 'DADOS' },
    { kind: 'dark', role: 'expansion', tag: 'EXPANSÃO' },
    { kind: 'light', role: 'application', tag: 'CASO' },
    { kind: 'dark', role: 'application', tag: 'APLICAÇÃO' },
    GRAD,
    CTA_LIGHT,
  ],
};

export const SUPPORTED_SLIDE_COUNTS = [5, 7, 9, 12] as const;
export type SlideCount = (typeof SUPPORTED_SLIDE_COUNTS)[number];

/** Arco narrativo (Bloco 6): roles dos slides internos, ciclado para qualquer N. */
const NARRATIVE: Array<{ role: SlideRole; tag: string }> = [
  { role: 'hook', tag: 'HOOK' },
  { role: 'context', tag: 'CONTEXTO' },
  { role: 'mechanism', tag: 'MECANISMO' },
  { role: 'proof', tag: 'PROVA' },
  { role: 'expansion', tag: 'EXPANSÃO' },
  { role: 'application', tag: 'APLICAÇÃO' },
];

/**
 * Gera uma sequência Alternado Claro/Escuro para QUALQUER número de slides.
 * capa (image) → internos dark/light alternados → grad (direction) no penúltimo
 * quando N≥6 → CTA (light). O kind alterna independente do papel narrativo.
 */
export function buildDynamicSequence(total: number): TemplateSlot[] {
  const n = Math.max(3, Math.floor(total));
  const seq: TemplateSlot[] = [COVER];
  const innerCount = n - 2;
  for (let k = 0; k < innerCount; k++) {
    const isLastInner = k === innerCount - 1;
    if (isLastInner && n >= 6) {
      seq.push(GRAD);
      continue;
    }
    const narr = NARRATIVE[k % NARRATIVE.length];
    seq.push({
      kind: k % 2 === 0 ? 'dark' : 'light',
      role: narr.role,
      tag: narr.tag,
    });
  }
  seq.push(CTA_LIGHT);
  return seq;
}

/**
 * Retorna a sequência do template para N slides. Usa as sequências curadas
 * (5/7/9/12) quando N bate exatamente; caso contrário gera uma dinâmica.
 */
export function templateSequence(count: number): TemplateSlot[] {
  if (SEQUENCES[count]) return SEQUENCES[count];
  return buildDynamicSequence(count);
}

/* ----------------------------------------------- catálogo de templates (Fase 2) */

export type FunnelStage = 'topo' | 'meio' | 'fundo';

export const FUNNEL_LABELS: Record<FunnelStage, string> = {
  topo: 'Topo de funil',
  meio: 'Meio de funil',
  fundo: 'Fundo de funil',
};

/**
 * Template nomeado — estrutura curada (sequência de fundos + diagramação por
 * slide) por etapa de funil. O conteúdo é preenchido depois (autofill/edição).
 * É a base do seletor de templates (Fase 3, modal inspirado na referência).
 */
export interface CarouselTemplate {
  id: string;
  name: string;
  funnel: FunnelStage;
  description: string;
  slots: TemplateSlot[];
}

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'gancho-tese',
    name: 'Gancho / Tese',
    funnel: 'topo',
    description: 'Abre uma tese forte e a sustenta com dado e prática. 9 slides.',
    slots: [
      COVER,
      { kind: 'dark', role: 'hook', tag: 'HOOK' },
      { kind: 'light', role: 'context', tag: 'CONTEXTO' },
      { kind: 'dark', role: 'mechanism', tag: 'MECANISMO', layout: 'card' },
      { kind: 'light', role: 'proof', tag: 'DADO', layout: 'stat' },
      { kind: 'dark', role: 'expansion', tag: 'EXPANSÃO' },
      { kind: 'light', role: 'application', tag: 'NA PRÁTICA', layout: 'list' },
      GRAD,
      CTA_LIGHT,
    ],
  },
  {
    id: 'lista-pratica',
    name: 'Lista Prática',
    funnel: 'meio',
    description: 'Passo a passo acionável com lista e comparativo. 7 slides.',
    slots: [
      COVER,
      { kind: 'dark', role: 'hook', tag: 'HOOK' },
      { kind: 'light', role: 'application', tag: 'OS PASSOS', layout: 'list' },
      { kind: 'dark', role: 'mechanism', tag: 'DESTAQUE', layout: 'card' },
      { kind: 'light', role: 'proof', tag: 'COMPARATIVO', layout: 'table' },
      GRAD,
      CTA_LIGHT,
    ],
  },
  {
    id: 'noticia-citacao',
    name: 'Notícia / Citação',
    funnel: 'topo',
    description: 'Formato notícia: imagem em destaque e citação. 7 slides.',
    slots: [
      COVER,
      { kind: 'dark', role: 'hook', tag: 'A MANCHETE' },
      { kind: 'light', role: 'context', tag: 'O FATO', layout: 'img-box' },
      { kind: 'dark', role: 'proof', tag: 'CITAÇÃO', layout: 'card' },
      { kind: 'light', role: 'expansion', tag: 'ANÁLISE' },
      GRAD,
      CTA_LIGHT,
    ],
  },
];

export function findTemplate(id: string): CarouselTemplate | undefined {
  return CAROUSEL_TEMPLATES.find((t) => t.id === id);
}
