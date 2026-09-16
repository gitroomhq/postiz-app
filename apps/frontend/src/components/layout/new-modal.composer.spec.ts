import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./new-modal.tsx', import.meta.url)),
  'utf8',
);

describe('composer modal chrome', () => {
  it('fills the viewport on phone and tablet instead of applying size 80%', () => {
    assert.match(source, /id === 'add-edit-modal'/);
    assert.match(source, /isComposer && touch/);
    assert.match(source, /h-dvh w-full/);
    assert.match(source, /style: \{ width: modal.size \}/);
    assert.match(source, /!fillViewport && \{ style:/);
  });

  it('centers a max-1400px card on desktop so 80% width is not left-aligned', () => {
    assert.match(source, /isComposer && !touch/);
    assert.match(source, /items-center justify-center/);
    assert.match(source, /max-w-\[1400px\]/);
    assert.match(source, /p-\[32px\]/);
    assert.match(source, /data-pq-composer-shell/);
  });
});
