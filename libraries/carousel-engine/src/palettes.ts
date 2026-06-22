import type { BrandKit, VisualStyle } from './schema';

/**
 * Tabela de paletas por nicho — espelha o Bloco 3 do system-prompt do Cedrico.
 * Usada quando o usuário não informa cor própria no briefing.
 */
export interface NichePalette {
  primary: string;
  accent: string;
  bgLight: string;
  bgDark: string;
  font: string;
}

export const NICHE_PALETTES: Record<string, NichePalette> = {
  'marketing digital': { primary: '#E8421A', accent: '#FF6B47', bgLight: '#F7F4F1', bgDark: '#0F0D0C', font: 'Barlow Condensed' },
  imobiliario: { primary: '#1B2A4A', accent: '#C9A84C', bgLight: '#F5F0E8', bgDark: '#0D1B2A', font: 'Montserrat' },
  fitness: { primary: '#1A1A2E', accent: '#E94560', bgLight: '#F0F4F8', bgDark: '#16213E', font: 'Inter' },
  gastronomia: { primary: '#2C1810', accent: '#D4A574', bgLight: '#FDF6ED', bgDark: '#1A1008', font: 'Playfair Display' },
  moda: { primary: '#1C1C1C', accent: '#C4956A', bgLight: '#FAF5F0', bgDark: '#0A0A0A', font: 'Cormorant Garamond' },
  educacao: { primary: '#1B3A4B', accent: '#34B3A0', bgLight: '#F0FAF7', bgDark: '#0D2137', font: 'Source Sans Pro' },
  tech: { primary: '#0A192F', accent: '#64FFDA', bgLight: '#F0F4F8', bgDark: '#020C1B', font: 'Space Grotesk' },
  juridico: { primary: '#1A1A2E', accent: '#B8860B', bgLight: '#F5F1E8', bgDark: '#0D0D1A', font: 'EB Garamond' },
  contabilidade: { primary: '#1C2541', accent: '#3A7D44', bgLight: '#F2F6F3', bgDark: '#0B132B', font: 'Roboto' },
  ecommerce: { primary: '#1A1A1A', accent: '#FF6B35', bgLight: '#FFF8F2', bgDark: '#0D0D0D', font: 'DM Sans' },
  pet: { primary: '#2D3436', accent: '#E17055', bgLight: '#FFF5F0', bgDark: '#1A1A1A', font: 'Quicksand' },
};

/** Pareamento de fontes por estilo visual (Bloco 3). */
export const STYLE_FONTS: Record<VisualStyle, { headline: string; body: string }> = {
  classic: { headline: 'Playfair Display', body: 'DM Sans' },
  modern: { headline: 'Barlow Condensed', body: 'Plus Jakarta Sans' },
  minimal: { headline: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
  bold: { headline: 'Space Grotesk', body: 'Space Grotesk' },
};

/** Paleta Vocaccio como fallback default (aurora quente). */
export const VOCACCIO_DEFAULT: NichePalette = {
  primary: '#cf6295',
  accent: '#e89a7b',
  bgLight: '#f5f4f0',
  bgDark: '#201f1d',
  font: 'Barlow Condensed',
};

const VOCACCIO_GRADIENT = ['#e89a7b', '#cf6295', '#7360aa', '#2897bf'];

const DIACRITICS = /[̀-ͯ]/g;

function normalizeNiche(niche?: string): string {
  return (niche ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .trim();
}

function findPalette(niche?: string): NichePalette {
  const key = normalizeNiche(niche);
  if (NICHE_PALETTES[key]) return NICHE_PALETTES[key];
  const partial = Object.keys(NICHE_PALETTES).find(
    (k) => key.includes(k) || k.includes(key)
  );
  return partial ? NICHE_PALETTES[partial] : VOCACCIO_DEFAULT;
}

export interface BrandBriefing {
  brandName?: string;
  handle?: string;
  copyright?: string;
  avatarUrl?: string;
  niche?: string;
  /** Cor principal informada (hex). Se ausente, deriva do nicho. */
  primary?: string;
  visualStyle?: VisualStyle;
}

/**
 * Deriva um BrandKit completo a partir do briefing — da cor informada OU da
 * tabela de nicho. Ponte entre o que o Cedrico coleta e o que o motor renderiza.
 */
export function deriveBrandKit(briefing: BrandBriefing): BrandKit {
  const palette = findPalette(briefing.niche);
  const style = briefing.visualStyle ?? 'modern';
  const fonts = STYLE_FONTS[style];
  const primary = briefing.primary ?? palette.primary;

  return {
    brandName: briefing.brandName ?? '',
    handle: briefing.handle ?? '',
    copyright: briefing.copyright ?? '',
    avatarUrl: briefing.avatarUrl,
    primary,
    accent: palette.accent,
    bgLight: palette.bgLight,
    bgDark: palette.bgDark,
    gradient: VOCACCIO_GRADIENT,
    accentBar: primary,
    fontHeadline: fonts.headline,
    fontBody: fonts.body,
    visualStyle: style,
  };
}
