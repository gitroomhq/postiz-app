import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./live.bridge.tsx', import.meta.url)),
  'utf8',
);

describe('NotificationsLiveBridge toasts', () => {
  it('classifies publish success instead of always using info', () => {
    assert.match(source, /splitNotificationContent/);
    assert.match(source, /kind === 'success'/);
    assert.doesNotMatch(source, /toaster\.show\(text, \{ kind: 'info' \}\)/);
  });

  it('passes the live URL as a View post action, not as toast body', () => {
    assert.match(source, /href: split\.url/);
    assert.match(source, /View post/);
    assert.match(source, /toaster\.show\(split\.text/);
  });
});
