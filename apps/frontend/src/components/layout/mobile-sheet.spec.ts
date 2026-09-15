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
    assert.match(source, /document\.body\.style\.overflow = 'hidden'/);
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

const overlay = readFileSync(
  fileURLToPath(new URL('./leave-settings.tsx', import.meta.url)),
  'utf8',
);
const settings = readFileSync(
  fileURLToPath(new URL('./settings.component.tsx', import.meta.url)),
  'utf8',
);
const connect = readFileSync(
  fileURLToPath(
    new URL('../public-api/connect-panel.tsx', import.meta.url)
  ),
  'utf8',
);

describe('settings and connect overlay on tablet', () => {
  it('covers the app chrome and goes edge to edge on phone and tablet', () => {
    assert.match(overlay, /z-\[220\]/);
    assert.match(overlay, /touch \? 'p-0' : 'p-\[44px_24px\]'/);
    assert.match(settings, /touch\s*\n\s*\? 'h-full w-full rounded-none'/);
    assert.match(connect, /touch\s*\n\s*\? 'h-full w-full rounded-none'/);
  });
});

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
