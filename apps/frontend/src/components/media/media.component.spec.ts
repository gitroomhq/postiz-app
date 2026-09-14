import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./media.component.tsx', import.meta.url)),
  'utf8',
);

describe('composer media hover actions', () => {
  it('uses glass circles instead of inset-shadow 18px chips', () => {
    assert.match(source, /rounded-full bg-black\/65 text-white/);
    assert.doesNotMatch(
      source,
      /h-\[18px\] w-\[18px\].*shadow-\[inset_0_0_0_1px_var\(--border\)\]/,
    );
  });
});
