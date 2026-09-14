import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const instagram = readFileSync(
  fileURLToPath(
    new URL('./providers/instagram/instagram.preview.tsx', import.meta.url)
  ),
  'utf8',
);
const facebook = readFileSync(
  fileURLToPath(
    new URL('./providers/facebook/facebook.preview.tsx', import.meta.url)
  ),
  'utf8',
);

describe('post preview media frame', () => {
  it('does not force Instagram into a 585px cover box', () => {
    assert.match(instagram, /PreviewMediaFrame/);
    assert.doesNotMatch(instagram, /h-\[585px\]/);
  });

  it('does not force Facebook into a 280px cover box', () => {
    assert.match(facebook, /PreviewMediaFrame/);
    assert.doesNotMatch(facebook, /h-\[280px\]/);
  });

  it('shows the channel handle on Instagram, not only the page name', () => {
    assert.match(instagram, /formatChannelHandle\(integration\?\.display\)/);
  });
});
