/**
 * fonts.ts — gestão de fontes para render Konva no browser.
 *
 * Diferença crítica vs. a abordagem antiga (HTML+Playwright+base64): com Konva,
 * a fonte precisa estar carregada no `document.fonts` ANTES de `toDataURL`, senão
 * o canvas rasteriza o fallback. Não usamos base64; carregamos via Google Fonts
 * e esperamos `document.fonts.ready`.
 */

/** Fontes de headline/body usadas pelas paletas e estilos visuais. */
export const CAROUSEL_FONTS = [
  'Barlow Condensed',
  'Plus Jakarta Sans',
  'Playfair Display',
  'DM Sans',
  'Space Grotesk',
  'Montserrat',
  'Inter',
  'Cormorant Garamond',
  'Source Sans Pro',
  'EB Garamond',
  'Roboto',
  'Quicksand',
  // +5 fontes Google mais usadas atualmente + Comfortaa (Felipe, 2026-06-19)
  'Poppins',
  'Open Sans',
  'Lato',
  'Raleway',
  'Oswald',
  'Comfortaa',
] as const;

const DEFAULT_WEIGHTS = [400, 500, 700, 800, 900];

/**
 * Pesos disponíveis por família no Google Fonts. Necessário porque o CSS2 API
 * rejeita pesos inexistentes — pedir 900 numa fonte que vai só até 700 quebra o
 * carregamento. Famílias fora deste mapa usam o conjunto padrão.
 */
const FONT_WEIGHTS: Record<string, number[]> = {
  Oswald: [400, 500, 700],
  Comfortaa: [400, 500, 700],
  'Open Sans': [400, 500, 700, 800],
  Lato: [400, 700, 900], // Lato não tem 500 nem 800
};

function weightsFor(family: string): number[] {
  return FONT_WEIGHTS[family] ?? DEFAULT_WEIGHTS;
}

/** Pesos disponíveis (carregados) de uma família — p/ o seletor de peso na UI. */
export function fontWeightsFor(family: string): number[] {
  return weightsFor(family);
}

/** Rótulos legíveis por peso. */
export const FONT_WEIGHT_LABELS: Record<number, string> = {
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** Monta o href da Google Fonts CSS2 com os pesos corretos de cada família. */
export function googleFontsHref(families: readonly string[] = CAROUSEL_FONTS): string {
  const params = families
    .map((f) => `family=${encodeURIComponent(f)}:wght@${weightsFor(f).join(';')}`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Garante que as famílias informadas estejam carregadas. Resolve quando o
 * browser confirma as fontes — chamar antes de render/export para fidelidade.
 * Sem `weights`, usa os pesos suportados por cada família.
 */
export async function ensureFontsLoaded(
  families: string[],
  weights?: number[]
): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  const loads: Promise<unknown>[] = [];
  for (const family of families) {
    for (const weight of weights ?? weightsFor(family)) {
      loads.push(document.fonts.load(`${weight} 48px "${family}"`).catch(() => undefined));
    }
  }
  await Promise.all(loads);
  await document.fonts.ready;
}
