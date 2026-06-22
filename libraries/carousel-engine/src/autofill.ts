import type { CarouselContent, SlideContent } from './layout';

/**
 * autofill.ts — distribui texto colado livre pelos slides (o "Aplicar Texto" do
 * Brands Decoded). Resolve o problema da tela em branco: o usuário cola um bloco
 * e o motor mapeia linha→slide por posição.
 *
 * Formato esperado (flexível):
 *   - 1ª linha não-vazia = headline da capa
 *   - linhas iniciadas por "- " ou "•" = um slide interno cada
 *   - última linha iniciada por "CTA:" = CTA (senão usa a última linha)
 *
 * Dentro de um slide, "Título :: corpo" separa título e body (opcional).
 */
export function autofillFromText(raw: string, slideCount = 9): CarouselContent {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headline: '', slides: [], cta: '' };
  }

  let headline = '';
  let cta = '';
  const bulletLines: string[] = [];

  for (const line of lines) {
    const ctaMatch = line.match(/^cta\s*[:：-]\s*(.+)$/i);
    if (ctaMatch) {
      cta = ctaMatch[1].trim();
      continue;
    }
    const bullet = line.replace(/^[-•*]\s+/, '');
    if (bullet !== line) {
      bulletLines.push(bullet.trim());
    } else if (!headline) {
      headline = line;
    } else {
      bulletLines.push(line);
    }
  }

  if (!headline && bulletLines.length) headline = bulletLines.shift() as string;
  if (!cta && bulletLines.length) cta = bulletLines.pop() as string;

  const innerTarget = Math.max(0, slideCount - 2); // descontando capa + CTA
  const slides: SlideContent[] = bulletLines.slice(0, innerTarget).map(toSlideContent);

  return { headline, slides, cta };
}

function toSlideContent(line: string): SlideContent {
  const parts = line.split(/\s*::\s*/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), body: parts.slice(1).join(' :: ').trim() };
  }
  // heurística: frase curta vira título; frase longa vira body
  return line.length <= 60 ? { title: line } : { body: line };
}

/** Limpa marcação leve de markdown e espaços extras de um texto. */
function cleanText(t: string): string {
  return t
    .replace(/^\*\*|\*\*$/g, '') // negrito markdown nas pontas
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rótulo "texto N -" / "texto N:" / "**texto N**." no início da linha. */
const PAIR_LABEL = /^(?:\*\*)?\s*texto\s*(\d+)\s*(?:\*\*)?\s*[-–—:.)]\s*(.+)$/i;

/**
 * Parser do formato pareado da "Máquina de Carrosséis" (GPT externo).
 *
 * Cada slide tem dois textos: ÍMPAR = primário (título), PAR = secundário (corpo).
 *   texto 1 → primário da capa     texto 2 → secundário da capa
 *   texto 3 → primário do slide 2  texto 4 → secundário do slide 2
 *   ...
 *   texto N-1 → primário do CTA     texto N → secundário do CTA (chamada)
 *
 * Aceita as linhas rotuladas ("texto N - …", ordenadas pelo número) ou texto
 * limpo (uma frase por linha, na ordem). O número de PARES define os slides —
 * o motor gera a sequência claro/escuro dinâmica para qualquer contagem.
 */
export function parsePairedText(raw: string): CarouselContent {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const labeled: Array<{ n: number; text: string }> = [];
  const unlabeled: string[] = [];
  for (const line of lines) {
    const m = line.match(PAIR_LABEL);
    if (m) labeled.push({ n: Number(m[1]), text: cleanText(m[2]) });
    else unlabeled.push(cleanText(line));
  }

  const texts = labeled.length
    ? labeled.sort((a, b) => a.n - b.n).map((l) => l.text)
    : unlabeled;

  if (texts.length === 0) {
    return { headline: '', headlineSecondary: '', slides: [], cta: '', ctaSecondary: '' };
  }

  // agrupa em pares [primário, secundário?]
  const pairs: Array<[string, string?]> = [];
  for (let i = 0; i < texts.length; i += 2) pairs.push([texts[i], texts[i + 1]]);

  const cover = pairs[0];
  const content: CarouselContent = {
    headline: cover[0] ?? '',
    headlineSecondary: cover[1] ?? '',
    slides: [],
    cta: '',
    ctaSecondary: '',
  };

  if (pairs.length >= 2) {
    const cta = pairs[pairs.length - 1];
    content.cta = cta[0] ?? '';
    content.ctaSecondary = cta[1] ?? '';
    content.slides = pairs.slice(1, -1).map(([primary, secondary]) => ({
      title: primary,
      body: secondary,
    }));
  }

  return content;
}

/** Conta quantos pares (slides) o texto colado produz — para feedback na UI. */
export function countPairs(raw: string): number {
  const c = parsePairedText(raw);
  if (!c.headline && c.slides.length === 0) return 0;
  return 1 + c.slides.length + (c.cta ? 1 : 0);
}

/** Um aviso de comprimento: o texto pode transbordar a área do slide ao renderizar. */
export interface TextLengthWarning {
  /** Índice do slide (1-based) ao qual o texto pertence. */
  slide: number;
  /** Papel do texto no slide. */
  role: 'capa' | 'subtítulo' | 'título' | 'corpo' | 'CTA';
  chars: number;
  max: number;
}

/** Limites de caracteres por tipo de texto (acima disso há risco de aperto/corte no slide). */
const LENGTH_LIMITS = {
  headline: 90, // primário da capa (96px uppercase, até ~5 linhas)
  subtitle: 130, // secundário da capa
  title: 80, // título de slide interno (60px, até ~3 linhas)
  body: 380, // corpo de slide interno (40px, ~11 linhas)
  ctaTitle: 80,
  ctaBody: 380,
};

/** Remove a marcação <em> antes de medir o comprimento real do texto. */
function visibleLength(text?: string): number {
  return (text ?? '').replace(/<\/?em>/gi, '').trim().length;
}

/**
 * Verifica os comprimentos dos textos colados contra os limites do layout e
 * retorna os que podem transbordar — para avisar o usuário antes de aplicar.
 */
export function lintPairedText(raw: string): TextLengthWarning[] {
  const c = parsePairedText(raw);
  const out: TextLengthWarning[] = [];
  const check = (slide: number, role: TextLengthWarning['role'], text: string | undefined, max: number) => {
    const chars = visibleLength(text);
    if (chars > max) out.push({ slide, role, chars, max });
  };

  if (!c.headline && c.slides.length === 0) return out;

  check(1, 'capa', c.headline, LENGTH_LIMITS.headline);
  check(1, 'subtítulo', c.headlineSecondary, LENGTH_LIMITS.subtitle);

  c.slides.forEach((s, i) => {
    const slide = i + 2; // após a capa
    check(slide, 'título', s.title, LENGTH_LIMITS.title);
    check(slide, 'corpo', s.body, LENGTH_LIMITS.body);
  });

  if (c.cta) {
    const last = 1 + c.slides.length + 1;
    check(last, 'CTA', c.cta, LENGTH_LIMITS.ctaTitle);
    check(last, 'corpo', c.ctaSecondary, LENGTH_LIMITS.ctaBody);
  }

  return out;
}
