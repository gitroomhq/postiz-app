import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const pickerSource = readFileSync(
  fileURLToPath(new URL('./with-continue-provider.tsx', import.meta.url)),
  'utf8',
);
const facebookSource = readFileSync(
  fileURLToPath(new URL('./facebook/facebook.continue.tsx', import.meta.url)),
  'utf8',
);

describe('continue picker multi-select', () => {
  it('toggles checkboxes instead of replacing a radio selection', () => {
    assert.match(pickerSource, /role="checkbox"/);
    assert.match(pickerSource, /toggleContinueSelection/);
    assert.doesNotMatch(pickerSource, /role="radio"/);
  });

  it('sends every selected Facebook page in one Save', () => {
    assert.match(
      facebookSource,
      /Array\.isArray\(selection\) \? \{ pages: selection \}/,
    );
  });

  it('crops page photos to a square, not a circle or a stretched rectangle', () => {
    assert.match(pickerSource, /!rounded-\[12px\]/);
    assert.doesNotMatch(
      pickerSource,
      /\[&_img\]:!rounded-full/,
    );
  });
});
