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
const listEnd = calendar.indexOf('const DayHourSection');
const monthBlock = calendar.slice(monthStart, dayStart);
const dayBlock = calendar.slice(dayStart, weekStart);
const weekBlock = calendar.slice(weekStart, listStart);
const listBlock = calendar.slice(
  listStart,
  listEnd > listStart ? listEnd : calendar.length,
);

function publishedClass(block: string) {
  assert.match(block, /t\('published', 'Published'\)/);
  const re = /className="([^"]*)"/g;
  let chosen = '';
  let match;
  while ((match = re.exec(block))) {
    const cls = match[1];
    if (cls.includes('invisible')) continue;
    if (
      cls.includes('shrink-0') &&
      cls.includes('whitespace-nowrap') &&
      (cls.includes('bg-pqOkSoft') || cls.includes('text-pqOk'))
    ) {
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

  it('puts month Published at the end so the title starts after time', () => {
    const cls = publishedClass(monthBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.match(cls, /ms-auto/);
    assert.doesNotMatch(cls, /truncate/);
    assert.doesNotMatch(monthBlock, /right-\[/);
    assert.match(
      monthBlock,
      /min-w-0 truncate text-\[10px\] font-\[700\] text-pqMuted/,
    );
    assert.match(
      monthBlock,
      /min-w-0 flex-1 truncate text-\[10\.5px\] text-pqText/,
    );
    const title = monthBlock.indexOf(
      'min-w-0 flex-1 truncate text-[10.5px] text-pqText',
    );
    const chip = monthBlock.indexOf("t('published', 'Published')");
    assert.ok(title >= 0 && chip > title, 'title precedes Published on the chip');
  });

  it('keeps day Published on a nowrap shrink-0 chip while the name truncates', () => {
    const cls = publishedClass(dayBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.doesNotMatch(cls, /truncate/);
    assert.doesNotMatch(dayBlock, /right-\[/);
    assert.match(dayBlock, /min-w-0 truncate text-\[11\.5px\] text-pqSoft/);
    assert.match(dayBlock, /data-published-at="header"/);
    assert.match(dayBlock, /data-published-at="title"/);
    assert.match(dayBlock, /ms-auto flex h-\[16px\] shrink-0/);
  });

  it('places list/day-agenda Published at the header end, else under the title at start', () => {
    assert.match(listBlock, /data-published-at=\{\s*state === 'PUBLISHED' \? 'header' : undefined/);
    assert.match(listBlock, /data-published-at="title"/);
    assert.match(listBlock, /ms-auto flex h-\[20px\] shrink-0/);
    assert.doesNotMatch(listBlock, /right-\[/);
    const cls = publishedClass(listBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
  });

  it('places week Published on the header end when the card has room, else under the title at start', () => {
    const cls = publishedClass(weekBlock);
    assert.match(cls, /shrink-0/);
    assert.match(cls, /whitespace-nowrap/);
    assert.doesNotMatch(cls, /truncate/);
    assert.doesNotMatch(weekBlock, /right-\[/);
    assert.match(weekBlock, /data-published-at="header"/);
    assert.match(weekBlock, /data-published-at="title"/);
    assert.match(weekBlock, /ms-auto flex h-\[14px\] shrink-0/);
    assert.match(calendar, /function usePublishedOnHeader/);

    const headerChip = weekBlock.indexOf('data-published-at="header"');
    const titleChip = weekBlock.indexOf('data-published-at="title"');
    const title = weekBlock.indexOf(
      "'min-w-0 flex-1 break-words text-start text-[11px] leading-[1.3] text-pqText'",
    );
    assert.ok(headerChip >= 0, 'header placement exists');
    assert.ok(titleChip > headerChip, 'title-row fallback follows the header chip');
    assert.ok(title > titleChip, 'title still starts on its own row, left');
    assert.match(
      weekBlock,
      /min-w-0 truncate text-\[10px\] font-\[700\] -tracking-\[0\.1px\]/,
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
