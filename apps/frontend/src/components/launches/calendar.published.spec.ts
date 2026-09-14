import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);

const monthStart = calendar.indexOf("if (props.display === 'month')");
const dayStart = calendar.indexOf("if (props.display === 'day')");
const weekStart = calendar.indexOf(
  'The error marker moved into the card',
);
const listStart = calendar.indexOf('const ListItem:');
const monthBlock = calendar.slice(monthStart, dayStart);
const dayBlock = calendar.slice(dayStart, weekStart);
const weekBlock = calendar.slice(weekStart, listStart);

function publishedClass(block: string) {
  const call = block.indexOf("t('published', 'Published')");
  assert.ok(call >= 0, 'Published label is printed');
  const spanOpen = '<span className="';
  let chosen = '';
  for (
    let from = block.indexOf(spanOpen);
    from >= 0 && from < call;
    from = block.indexOf(spanOpen, from + spanOpen.length)
  ) {
    const start = from + spanOpen.length;
    const quote = block.indexOf('"', start);
    if (quote < 0 || quote > call) {
      continue;
    }
    const cls = block.slice(start, quote);
    if (cls.includes('shrink-0') && cls.includes('whitespace-nowrap')) {
      chosen = cls;
    }
  }
  assert.ok(chosen, 'Published chip is shrink-0 whitespace-nowrap');
  return chosen;
}

describe('calendar published label', () => {
  it('prints Published on month chips, not only a green border', () => {
    assert.match(calendar, /props\.display === 'month'/);
    assert.match(monthBlock, /t\('published', 'Published'\)/);
  });

  it('lets month time and title shrink so Published cannot clip to PUBLIS', () => {
    const cls = publishedClass(monthBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.doesNotMatch(cls, /truncate/);
    assert.match(
      monthBlock,
      /min-w-0 truncate text-\[10px\] font-\[700\] text-pqMuted/,
    );
    assert.match(
      monthBlock,
      /min-w-0 flex-1 truncate text-\[10\.5px\] text-pqText/,
    );
  });

  it('keeps day Published on a nowrap shrink-0 chip while the name truncates', () => {
    const cls = publishedClass(dayBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.doesNotMatch(cls, /truncate/);
    assert.match(dayBlock, /min-w-0 truncate text-\[11\.5px\] text-pqSoft/);
  });

  it('puts week Published on the title row, not the overflow-hidden time row', () => {
    const cls = publishedClass(weekBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.doesNotMatch(cls, /truncate/);

    const timeRow = weekBlock.indexOf(
      'flex min-w-0 items-center gap-[5px]',
    );
    const timeRowEnd = weekBlock.indexOf(
      '<div className="flex min-w-0 items-start gap-[4px]">',
      timeRow,
    );
    const chip = weekBlock.indexOf(
      'flex h-[14px] shrink-0 items-center gap-[3px] whitespace-nowrap rounded-full bg-pqOkSoft',
    );
    const title = weekBlock.indexOf(
      "'min-w-0 flex-1 break-words text-start text-[11px] leading-[1.3] text-pqText'",
      chip,
    );
    assert.ok(timeRow >= 0, 'week time row exists');
    assert.ok(timeRowEnd > timeRow, 'week title row follows the time row');
    assert.ok(chip > timeRowEnd, 'Published is not a time-row sibling');
    assert.ok(title > chip, 'title shrinks beside Published, not the chip');
    assert.match(
      weekBlock.slice(timeRow, timeRowEnd),
      /min-w-0 truncate text-\[10px\] font-\[700\] -tracking-\[0\.1px\]/,
    );
    assert.doesNotMatch(
      weekBlock.slice(timeRow, timeRowEnd),
      /t\('published', 'Published'\)/,
    );
  });

  it('still paints past QUEUE as Published', () => {
    assert.match(
      calendar,
      /if \(state === 'QUEUE' && dayjs\(\)\.isAfter\(dayjs\.utc\(publishDate\)\)\) \{\s*return 'PUBLISHED';/s,
    );
  });

  it('gates Copy debug JSON behind isSuperAdmin', () => {
    const assignments = [...calendar.matchAll(/copyDebugJson=\{/g)];
    assert.equal(
      assignments.length,
      3,
      'list, calendar cell, and day list each pass copyDebugJson',
    );
    const gated = [
      ...calendar.matchAll(
        /copyDebugJson=\{\s*user\?\.isSuperAdmin \? copyDebugJson\(post\) : undefined\s*\}/g,
      ),
    ];
    assert.equal(
      gated.length,
      assignments.length,
      'every copyDebugJson prop is user?.isSuperAdmin, never always-on',
    );

    let from = 0;
    let icons = 0;
    while (true) {
      const idx = calendar.indexOf('<CopyDebug />', from);
      if (idx < 0) break;
      icons += 1;
      const nearby = calendar.slice(Math.max(0, idx - 180), idx);
      assert.match(
        nearby,
        /copyDebugJson && !demo/,
        'CopyDebug must not render unless the isSuperAdmin-gated callback is passed',
      );
      from = idx + 1;
    }
    assert.ok(icons >= 3, 'day, week/month, and list hover clusters');

    const copyDebugStart = calendar.indexOf('const CopyDebug');
    const copyDebugEnd = calendar.indexOf(
      'export const EditPost',
      copyDebugStart,
    );
    const copyDebug = calendar.slice(copyDebugStart, copyDebugEnd);
    assert.match(copyDebug, /copy_debug_json_admin/);
    assert.equal(
      copyDebug.includes("t('copy_debug_json'"),
      false,
      'icon tooltip is admin-only, not the old Copy Debug JSON string',
    );
  });
});
