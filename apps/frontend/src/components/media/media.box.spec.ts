import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('./media.box.tsx', import.meta.url)),
  'utf8',
);

describe('Media library thumbnails', () => {
  it('are square tiles, not 4/3 banners', () => {
    assert.match(source, /MEDIA_LIBRARY_THUMB_ASPECT = 'aspect-square'/);
    assert.match(source, /MEDIA_LIBRARY_THUMB_FILL = 'absolute inset-0 h-full w-full'/);
    assert.doesNotMatch(source, /aspect-\[4\/3\]/);
  });

  it('crops the drop-zone and picker grids with object-cover', () => {
    assert.match(source, /data-pq="media-grid"/);
    assert.match(source, /data-pq="media-library-grid"/);
    assert.equal(
      source.split('className={MEDIA_LIBRARY_THUMB_FILL}').length - 1,
      2
    );
    assert.match(source, /className="h-full w-full object-cover"/);
  });

  it('lets the composer picker fill two full square rows instead of a 264px cap', () => {
    assert.match(source, /MEDIA_LIBRARY_PICKER_HEIGHT = 'min\(760px, 86vh\)'/);
    assert.match(source, /MEDIA_LIBRARY_TWO_ROW_MIN = 'min\(348px,42vh\)'/);
    assert.match(source, /minHeight: MEDIA_LIBRARY_TWO_ROW_MIN/);
    assert.match(source, /flex h-full min-h-0 w-full flex-col/);
    assert.doesNotMatch(source, /max-h-\[min\(380px,48vh\)\]/);
    assert.doesNotMatch(source, /max-h-\[min\(264px,28vh\)\]/);
    assert.doesNotMatch(source, /visibleMedia\.length > 8/);
  });
});
