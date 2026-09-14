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
