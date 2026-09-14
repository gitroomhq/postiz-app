import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./mobile-sheet.tsx', import.meta.url)),
  'utf8',
);

describe('MobileSheet', () => {
  it('portals a dialog with a 44px close and safe-area padding', () => {
    assert.match(source, /data-pq="mobile-sheet"/);
    assert.match(source, /role="dialog"/);
    assert.match(source, /createPortal/);
    assert.match(source, /size-\[44px\]/);
    assert.match(source, /env\(safe-area-inset-bottom\)/);
    assert.match(source, /overscroll-contain/);
  });
});

const userMenu = readFileSync(
  fileURLToPath(new URL('../new-layout/user.menu.tsx', import.meta.url)),
  'utf8',
);
const helpMenu = readFileSync(
  fileURLToPath(new URL('../new-layout/help.menu.tsx', import.meta.url)),
  'utf8',
);

describe('phone account and help chrome', () => {
  it('opens the account menu as a bottom sheet', () => {
    assert.match(userMenu, /<MobileSheet/);
    assert.match(userMenu, /title=\{t\('account_menu'/);
    assert.match(userMenu, /size-\[44px\]/);
    assert.match(userMenu, /if \(!open \|\| touch\) return/);
  });

  it('opens Help as a bottom sheet instead of a hover popover', () => {
    assert.match(helpMenu, /<MobileSheet/);
    assert.match(helpMenu, /if \(!open \|\| touch\) return/);
    assert.match(helpMenu, /grid size-\[44px\]/);
  });
});
