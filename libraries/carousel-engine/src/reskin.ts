import type { BrandKit, Carousel } from './schema';

/**
 * reskin.ts — reaplica um BrandKit (config global do projeto) a um carrossel já
 * montado.
 *
 * O motor "assa" parte da identidade no momento do `buildCarousel`: a cor de
 * fundo de cada slide (`slide.background.color`) e a cor base de cada texto
 * (`TextNode.fill`) ficam gravadas no documento. Só o chrome (marca, @handle,
 * accent bar, barra de progresso) lê `brand.*` ao vivo no render. Por isso, trocar
 * só `doc.brand` NÃO recolore os fundos/textos já existentes — é preciso percorrer
 * os slides. Esta função faz isso de forma previsível:
 *
 *  - fundos `light`/`dark` recebem `next.bgLight`/`next.bgDark` (grad/image inalterados);
 *  - o `fill` base de um texto só muda se ainda era a cor de contraste padrão
 *    (branco ou o `bgDark` antigo) — fills customizados à mão são preservados;
 *  - cores de palavra (`run.color`/`run.highlight`) que apontavam para o
 *    primary/accent ANTIGO migram para os novos; destaques manuais com outra cor
 *    são preservados (são escolha intencional do usuário).
 */
export function reskinCarousel(doc: Carousel, next: BrandKit): Carousel {
  const prev = doc.brand;

  const remap = (c?: string): string | undefined => {
    if (!c) return c;
    if (c === prev.primary) return next.primary;
    if (c === prev.accent) return next.accent;
    return c;
  };

  const wasContrastBase = (fill: string): boolean =>
    fill === '#FFFFFF' || fill.toUpperCase() === '#FFFFFF' || fill === prev.bgDark;

  const slides = doc.slides.map((slide) => {
    const kind = slide.background.kind;
    let color = slide.background.color;
    if (kind === 'light') color = next.bgLight;
    else if (kind === 'dark') color = next.bgDark;

    const baseFill = kind === 'light' ? next.bgDark : '#FFFFFF';

    const nodes = slide.nodes.map((n) => {
      if (n.kind === 'shape') {
        return {
          ...n,
          fill: n.fill,
          borderLeftColor: remap(n.borderLeftColor),
        };
      }
      if (n.kind !== 'text') return n;
      const fill = wasContrastBase(n.fill) ? baseFill : n.fill;
      const runs = n.runs.map((r) => ({
        ...r,
        color: remap(r.color),
        highlight: remap(r.highlight),
      }));
      return { ...n, fill, runs };
    });

    return { ...slide, background: { ...slide.background, color }, nodes };
  });

  return {
    ...doc,
    brand: next,
    slides,
    updatedAt: new Date().toISOString(),
  };
}
