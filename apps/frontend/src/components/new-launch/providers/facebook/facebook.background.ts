import { FACEBOOK_PRESETS } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/facebook.dto';

// Facebook does not expose the real preset assets, so we approximate each
// background's color from its descriptive name (e.g. "Solid purple",
// "Gradient, dark orange-red", "Light blue illustration"). Solids/gradients end
// up close; illustrations collapse to a representative flat tint.

const PALETTE: Record<string, string> = {
  purple: '#8a3ffc',
  magenta: '#d6249f',
  pink: '#ec4899',
  red: '#e0294b',
  orange: '#f97316',
  yellow: '#f4c430',
  green: '#2fbf71',
  teal: '#17a2a2',
  blue: '#2d88ff',
  grey: '#65676b',
  brown: '#8b5e34',
  beige: '#d9c7a7',
  black: '#18191a',
};

// Order colors are searched/emitted in (name order isn't reliable).
const ORDER = Object.keys(PALETTE);

// For names without an explicit color word, key off the subject.
const SUBJECTS: Record<string, string> = {
  heart: 'red',
  flame: 'orange',
  rose: 'pink',
  'heart-eyes': 'yellow',
  laughter: 'yellow',
  smiling: 'yellow',
  emoji: 'yellow',
  rocket: 'blue',
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(hex: string, target: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const [tr, tg, tb] = hexToRgb(target);
  return rgbToHex(
    r + (tr - r) * amount,
    g + (tg - g) * amount,
    b + (tb - b) * amount
  );
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface PresetBackground {
  background: string;
  text: string;
}

export function getPresetBackground(
  id: string | undefined
): PresetBackground | undefined {
  if (!id) return undefined;
  const preset = FACEBOOK_PRESETS.find((p) => p.id === id);
  if (!preset) return undefined;

  const name = preset.name.toLowerCase();
  const isLight = /light/.test(name);
  const isDark = /\bdark\b|dark-/.test(name);

  let colors = ORDER.filter((c) => name.includes(c)).map((c) => PALETTE[c]);
  if (!colors.length) {
    const subject = Object.keys(SUBJECTS).find((k) => name.includes(k));
    colors = [PALETTE[subject ? SUBJECTS[subject] : 'grey']];
  }

  colors = colors.map((c) =>
    isLight ? mix(c, '#ffffff', 0.5) : isDark ? mix(c, '#000000', 0.32) : c
  );

  const background =
    name.includes('gradient') && colors.length >= 2
      ? `linear-gradient(135deg, ${colors.join(', ')})`
      : colors[0];

  const text = luminance(colors[0]) > 0.5 ? '#1c1e21' : '#ffffff';
  return { background, text };
}
