import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  chartDayLabel,
  chartTooltipBox,
} from './chart-social-label.ts';

const source = readFileSync(
  fileURLToPath(new URL('./chart-social.tsx', import.meta.url)),
  'utf8',
);

describe('chartDayLabel', () => {
  it('formats a single ISO day', () => {
    assert.equal(chartDayLabel('2026-09-08', 'en-US'), 'Sep 8');
  });

  it('keeps the first day when a leftover range is passed', () => {
    assert.equal(chartDayLabel('2026-09-08 - 2026-09-14', 'en-US'), 'Sep 8');
    assert.equal(chartDayLabel('2026-09-01 – 2026-09-07', 'en-US'), 'Sep 1');
  });
});

describe('chartTooltipBox', () => {
  it('prefers sitting above the caret with a gap', () => {
    const box = chartTooltipBox(200, 180, 80, 48, 800, 600, 12);
    assert.equal(box.left, 160);
    assert.equal(box.top, 120);
  });

  it('flips below only when there is no room above', () => {
    const box = chartTooltipBox(200, 20, 80, 48, 800, 600, 12);
    assert.equal(box.top, 32);
  });

  it('stays below the app header when minTop is raised', () => {
    const box = chartTooltipBox(200, 80, 80, 48, 800, 600, 12, 64);
    assert.equal(box.top, 92);
  });
});

describe('ChartSocial spark labels', () => {
  it('does not bucket day series into date ranges', () => {
    assert.doesNotMatch(source, /mergeDataPoints/);
    assert.doesNotMatch(source, /chunk\(/);
    assert.match(source, /const list = data/);
  });

  it('renders an HTML tooltip above the point instead of covering it', () => {
    assert.match(source, /enabled: false/);
    assert.match(source, /data-pq="chart-tooltip"/);
    assert.match(source, /chartTooltipBox/);
    assert.match(source, /z-\[220\]/);
    assert.match(source, /querySelector\('header'\)/);
    assert.match(source, /clip: false/);
  });
});
