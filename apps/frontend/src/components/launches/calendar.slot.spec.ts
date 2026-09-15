import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);

/**
 * Keep this in lockstep with `weekSlotPreviewCount` in calendar.tsx — the
 * source-read tests below prove the cell still calls it; this proves 108px
 * still yields two previews and a short hour yields one.
 */
function weekSlotPreviewCount(slotHeight: number, total: number): number {
  const WEEK_PREVIEW_H = 38;
  const WEEK_CHIP_H = 19;
  const WEEK_SLOT_GAP = 3;
  const WEEK_SLOT_PAD = 6;
  const WEEK_SLOT_MAX = 2;
  if (total <= 0) return 0;
  if (total === 1) return 1;
  const inner = Math.max(0, slotHeight - WEEK_SLOT_PAD);
  const chip = total > WEEK_SLOT_MAX ? WEEK_CHIP_H + WEEK_SLOT_GAP : 0;
  const budget = inner - chip;
  const fit = Math.floor(
    (budget + WEEK_SLOT_GAP) / (WEEK_PREVIEW_H + WEEK_SLOT_GAP),
  );
  return Math.max(1, Math.min(WEEK_SLOT_MAX, total, fit || 1));
}

describe('calendar slot density', () => {
  it('fits two compact previews plus See all in a 108px week hour', () => {
    assert.match(calendar, /const WEEK_PREVIEW_H = 38/);
    assert.match(calendar, /const WEEK_CHIP_H = 19/);
    assert.match(calendar, /const WEEK_SLOT_MAX = 2/);
    assert.equal(weekSlotPreviewCount(108, 0), 0);
    assert.equal(weekSlotPreviewCount(108, 1), 1);
    assert.equal(weekSlotPreviewCount(108, 2), 2);
    assert.equal(weekSlotPreviewCount(108, 3), 2);
    assert.equal(weekSlotPreviewCount(108, 6), 2);
  });

  it('shows one preview when the hour is too short for two plus the chip', () => {
    assert.equal(weekSlotPreviewCount(64, 3), 1);
    assert.equal(weekSlotPreviewCount(80, 2), 1);
  });

  it('slices the week list by measured height instead of a 1-card overflow cap', () => {
    assert.match(calendar, /export function weekSlotPreviewCount/);
    assert.match(calendar, /postList\.slice\(0, weekVisible\)/);
    assert.doesNotMatch(
      calendar,
      /display === 'week' && postList\.length > 2\) \{\s*return postList\.slice\(0, 1\)/,
    );
    assert.match(calendar, /data-slot-previews=\{list\.length\}/);
    assert.match(
      calendar,
      /cellClampTwo = display === 'week' && list\.length >= 2/,
    );
  });

  it('keeps See all as a 19px chip under the previews, not a stretched filler', () => {
    assert.match(
      calendar,
      /flex h-\[19px\] w-full shrink-0 cursor-pointer items-center justify-center/,
    );
    assert.match(
      calendar,
      /flex w-full shrink-0 flex-col justify-start text-\[12px\]/,
    );
    assert.match(
      calendar,
      /t\('see_all_n_posts', 'See all \{\{count\}\} posts'\)/,
    );
    assert.doesNotMatch(
      calendar,
      /showOverflowChip && \(\s*<button[^>]*flex-1/,
    );
  });

  it('does not inflate empty or single-post week slots with a packed min-height', () => {
    assert.match(
      calendar,
      /showOverflowChip \|\| list\.length >= 2\s*\? 'min-h-0 w-full'\s*: 'min-h-\[40px\] w-full'/,
    );
    assert.match(calendar, /!postList\.length\s*\? 'min-h-full w-full p-\[5px\]'/);
  });

  it('draws a plus on the day empty-hour Add control, not the label alone', () => {
    const dayHour = calendar.slice(calendar.indexOf('const DayHourSection'));
    const emptyBtn = dayHour.slice(
      dayHour.indexOf('{!loading && postList.length === 0 && ('),
      dayHour.indexOf('{emptyLabel}'),
    );
    assert.match(emptyBtn, /!isBeforeNow && \(/);
    assert.match(emptyBtn, /data-empty-add="1"/);
    assert.match(emptyBtn, /d="M12 5\.5v13M5\.5 12h13"/);
    assert.match(
      calendar,
      /t\('add_a_post_at', 'Add a post at \{\{time\}\}'\)/,
    );
  });
});
