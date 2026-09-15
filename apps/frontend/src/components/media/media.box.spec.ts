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

  it('lets the composer picker fill the phone sheet instead of a 264px cap', () => {
    assert.match(source, /touch && 'h-full min-h-0'/);
    assert.match(
      source,
      /touch\s*\?\s*'min-h-0 flex-1 overflow-y-auto scrollbar scrollbar-thumb-pqBorder scrollbar-track-pqInner'/,
    );
    assert.match(source, /max-h-\[min\(264px,28vh\)\]/);
  });
});
