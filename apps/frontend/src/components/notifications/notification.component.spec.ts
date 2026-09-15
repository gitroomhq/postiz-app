import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./notification.component.tsx', import.meta.url)),
  'utf8',
);

describe('notification panel rows', () => {
  it('shows a green tick for publish success and a real View post link', () => {
    assert.match(source, /splitNotificationContent/);
    assert.match(source, /kind === 'success'/);
    assert.match(source, /bg-pqOk text-white/);
    assert.match(source, /view_post/);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
  });

  it('uses readable Mark all read colour and distinct error/warning icons', () => {
    assert.match(source, /text-pqFocused/);
    assert.match(source, /kind === 'fail'/);
    assert.match(source, /kind === 'warning'/);
    assert.match(source, /bg-pqDanger/);
    assert.match(source, /bg-pqAmber/);
    assert.match(source, /t\('reconnect'/);
    assert.doesNotMatch(source, /text-pqBrand/);
  });
});
