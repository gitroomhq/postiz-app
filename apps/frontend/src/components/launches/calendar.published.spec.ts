import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const calendar = readFileSync(
  fileURLToPath(new URL('./calendar.tsx', import.meta.url)),
  'utf8',
);

describe('calendar published label', () => {
  it('prints Published on month chips, not only a green border', () => {
    assert.match(calendar, /props\.display === 'month'/);
    const monthStart = calendar.indexOf("if (props.display === 'month')");
    const dayStart = calendar.indexOf("if (props.display === 'day')");
    const monthBlock = calendar.slice(monthStart, dayStart);
    assert.match(monthBlock, /t\('published', 'Published'\)/);
  });

  it('prints Published on the week card before tags so tags cannot clip it', () => {
    const chip = calendar.indexOf(
      'flex h-[14px] shrink-0 items-center gap-[3px] rounded-full bg-pqOkSoft',
    );
    const tags = calendar.indexOf('{!!tagNames && (', chip);
    assert.ok(chip >= 0, 'week Published chip exists');
    assert.ok(tags > chip, 'Published sits before tags');
  });

  it('gates Copy debug JSON behind isSuperAdmin', () => {
    assert.match(calendar, /user\?\.isSuperAdmin \? copyDebugJson\(post\)/);
    assert.match(calendar, /copy_debug_json_admin/);
  });
});
