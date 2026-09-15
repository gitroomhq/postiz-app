import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./media.component.tsx', import.meta.url)),
  'utf8',
);

describe('composer media hover actions', () => {
  it('keeps the 48px thumb uncovered: corner X only, no overlay or extra chips', () => {
    assert.match(source, /absolute -end-\[6px\] -top-\[6px\].*size-\[16px\]/);
    assert.doesNotMatch(source, /bg-black\/(40|70)/);
    assert.doesNotMatch(source, /media_settings/);
    assert.doesNotMatch(source, /change_alt_text/);
    assert.doesNotMatch(source, /overflow-hidden transition-\[box-shadow\]/);
    assert.match(source, /!ghost &&\s+!touch &&\s+'opacity-0/);
    assert.match(source, /height: touch \? '100%' : MEDIA_LIBRARY_PICKER_HEIGHT/);
  });

  it('drags from the whole thumb, not a four-dot grab handle', () => {
    assert.match(source, /dragging h-\[48px\] w-\[48px\]/);
    assert.doesNotMatch(source, /reorder_media/);
  });
});
