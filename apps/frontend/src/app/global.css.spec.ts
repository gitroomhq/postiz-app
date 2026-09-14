import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./global.css', import.meta.url)),
  'utf8',
);

describe('global pointer cursor', () => {
  it('overrides Tailwind 4 button cursor:default in @layer base', () => {
    assert.match(source, /@layer base \{/);
    assert.match(
      source,
      /a\[href\],[\s\S]*button,[\s\S]*\[role='button'\][\s\S]*cursor:\s*pointer/,
    );
    assert.match(source, /:disabled[\s\S]*cursor:\s*not-allowed/);
  });
});
