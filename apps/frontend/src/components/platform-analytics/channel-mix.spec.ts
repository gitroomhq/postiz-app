import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { capChannelMix } from './channel-mix.ts';

const row = (
  id: string,
  impressions: number | null,
  posts = 1,
): Parameters<typeof capChannelMix>[0][number] => ({
  integrationId: id,
  platform: id,
  channelName: id,
  posts,
  impressions,
});

describe('capChannelMix', () => {
  it('drops unknown and zero impressions', () => {
    const { visible, other } = capChannelMix([
      row('a', 10),
      row('b', 0),
      row('c', null),
      row('d', 4),
    ]);
    assert.deepEqual(
      visible.map((item) => item.integrationId),
      ['a', 'd'],
    );
    assert.equal(other, null);
  });

  it('keeps the top 6 and rolls the rest into Other', () => {
    const rows = Array.from({ length: 9 }, (_, i) =>
      row(`c${i}`, 100 - i, i + 1),
    );
    const { visible, other } = capChannelMix(rows);
    assert.equal(visible.length, 6);
    assert.equal(visible[0].integrationId, 'c0');
    assert.equal(other?.count, 3);
    assert.equal(other?.impressions, 94 + 93 + 92);
    assert.equal(other?.posts, 7 + 8 + 9);
  });
});

const workspace = readFileSync(
  fileURLToPath(new URL('./workspace.analytics.tsx', import.meta.url)),
  'utf8',
);

const rail = readFileSync(
  fileURLToPath(new URL('./platform.analytics.tsx', import.meta.url)),
  'utf8',
);

describe('All channels layout', () => {
  it('does not pair By channel with Top 5 on an uneven split', () => {
    assert.doesNotMatch(workspace, /xl:grid-cols-\[minmax\(260px,0\.85fr\)/);
    assert.doesNotMatch(workspace, /md:col-span-4/);
  });

  it('snap-scrolls Top 5 below 1100px and uses equal desktop cards', () => {
    assert.match(workspace, /snap-x snap-mandatory/);
    assert.match(workspace, /min-\[1100px\]:grid/);
    assert.match(workspace, /repeat\(\$\{topPosts\.length\}/);
  });

  it('names the Top N heading after the number of cards shown on All channels only', () => {
    assert.match(workspace, /const matchShownCount = !integrationIds/);
    assert.match(workspace, /top_post/);
    assert.match(workspace, /top_n_posts/);
    assert.match(workspace, /matchShownCount && topPosts\.length === 1/);
    assert.match(workspace, /String\(topPosts\.length\)/);
  });
});

describe('All channels rail', () => {
  it('resets the analytics pane scroll when the channel changes', () => {
    assert.match(rail, /scrollResetKey=\{selected\}/);
    assert.match(rail, /paneRef\.current\.scrollTop = 0/);
  });

  it('uses a platform mosaic and an N channels subtitle', () => {
    assert.match(rail, /all-channels-mosaic/);
    assert.match(rail, /n_channels/);
    assert.doesNotMatch(rail, /all_channels_hint/);
    assert.equal((rail.match(/<AllChannelsMosaic /g) || []).length, 3);
  });
});
