/**
 * Client-only fixture media lifted from the design prototype's `MEDIA` seed
 * (`pagesVals` in PostQueen App v2.dc.html) so an empty local library can be
 * judged against the handoff.
 *
 * Not persisted. Never sent to the API. Shown only when the account has no real
 * media in the current fetch and UI demo mode is on (dev default, or `?uiDemo=1`).
 *
 * Removable: delete this file and the merge call in media.component.tsx.
 */

import {
  isUiDemoEnabled,
  UI_DEMO_STORAGE_KEY,
} from '@gitroom/frontend/components/launches/ui-demo-posts';

export { isUiDemoEnabled, UI_DEMO_STORAGE_KEY };

export type UiDemoMedia = {
  id: string;
  name: string;
  originalName: string;
  path: string;
  fileSize: number;
  uiDemo: true;
  kind: 'image' | 'video';
  meta: string;
  duration?: string;
  modified: string;
  /** CSS gradient for the card thumb when path is a video sample. */
  thumbGradient: string;
};

const GRADIENT_PAIRS: [string, string][] = [
  ['#7c3aed', '#4c1d95'],
  ['#0ea5e9', '#0c4a6e'],
  ['#ec4899', '#831843'],
  ['#f59e0b', '#7c2d12'],
  ['#10b981', '#064e3b'],
  ['#6366f1', '#312e81'],
  ['#ef4444', '#7f1d1d'],
  ['#14b8a6', '#134e4a'],
];

function hashName(name: string) {
  let h = 0;
  for (let k = 0; k < name.length; k++) h = (h * 31 + name.charCodeAt(k)) % 997;
  return h;
}

function gradientFor(name: string) {
  const p = GRADIENT_PAIRS[hashName(name) % GRADIENT_PAIRS.length];
  return `linear-gradient(145deg, ${p[0]} 0%, ${p[1]} 100%)`;
}

/** Inline SVG stand-in so localhost needs no CDN for stills. */
function demoImagePath(name: string, label: string) {
  const p = GRADIENT_PAIRS[hashName(name) % GRADIENT_PAIRS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600" viewBox="0 0 1600 1600">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p[0]}"/>
      <stop offset="100%" stop-color="${p[1]}"/>
    </linearGradient></defs>
    <rect width="1600" height="1600" fill="url(#g)"/>
    <text x="80" y="1480" fill="rgba(255,255,255,.85)" font-family="system-ui,sans-serif" font-size="64" font-weight="600">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Public CC0 sample used only for UI-demo video enlarge/playback.
 * Not uploaded; never referenced outside uiDemo mode.
 */
const DEMO_VIDEO_SAMPLE =
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm';

const SEED: [string, string][] = [
  ['v32-hero.png', 'product shot'],
  ['bts-reel.jpg', 'reel cover'],
  ['demo-60s.mp4', 'video 0:58'],
  ['launch-01.png', 'carousel 1/5'],
  ['launch-02.png', 'carousel 2/5'],
  ['spotlight.jpg', 'team photo'],
  ['ai-abstract.png', 'generated'],
  ['avatar-intro.mp4', 'video 0:22'],
  ['quote-card.png', 'quote card'],
  ['brand-mark.png', 'logo'],
  ['webinar-still.jpg', 'still frame'],
  ['meridian-chart.png', 'chart'],
  ['v31-hero.png', 'product shot'],
  ['office.jpg', 'photo'],
  ['ai-gradient.png', 'generated'],
  ['clip-teaser.mp4', 'video 0:15'],
  ['thread-cover.png', 'cover'],
  ['hiring.png', 'card'],
];

const MODIFIED = ['Today', 'Yesterday', 'Monday', 'Tuesday', 'Wednesday'];

export const UI_DEMO_MEDIA: UiDemoMedia[] = SEED.map(([name, kind], index) => {
  const isVideo = /\.mp4$/i.test(name);
  const ext = name.split('.').pop()?.toUpperCase() || 'PNG';
  const meta = isVideo
    ? 'MP4 · 1080×1920'
    : ext === 'JPG'
    ? 'JPG · 1600×1600'
    : 'PNG · 1600×1600';
  const duration = isVideo
    ? kind.includes('0:')
      ? kind.replace(/^video\s+/i, '')
      : name.length % 2
      ? '0:58'
      : '0:22'
    : undefined;
  const sizeMb = isVideo
    ? 8 + (name.length % 7) * 1.4
    : 0.6 + (name.length % 9) * 0.31;

  return {
    id: `ui-demo-media-${index}-${name}`,
    name,
    originalName: name,
    path: isVideo ? DEMO_VIDEO_SAMPLE : demoImagePath(name, kind),
    fileSize: Math.round(sizeMb * 1024 * 1024),
    uiDemo: true as const,
    kind: isVideo ? 'video' : 'image',
    meta,
    duration,
    modified: MODIFIED[name.length % 5],
    thumbGradient: gradientFor(name),
  };
});
