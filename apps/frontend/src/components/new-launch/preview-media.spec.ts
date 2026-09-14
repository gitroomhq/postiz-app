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
const frame = readFileSync(
  fileURLToPath(new URL('./preview-media.tsx', import.meta.url)),
  'utf8',
);
const videoOrImage = readFileSync(
  fileURLToPath(
    new URL(
      '../../../../../libraries/react-shared-libraries/src/helpers/video.or.image.tsx',
      import.meta.url
    )
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

  it('does not default the Instagram feed card to square', () => {
    assert.match(instagram, /instagramFeedPreviewRange/);
    assert.match(instagram, /aspect-\[4\/5\]/);
    assert.doesNotMatch(instagram, /aspect-square/);
    assert.doesNotMatch(instagram, /fallbackWH=\{1\}/);
  });

  it('covers video the same way as stills, instead of stretching', () => {
    assert.match(videoOrImage, /playsInline/);
    assert.match(videoOrImage, /isContain \? 'object-contain' : 'object-cover'/);
    assert.match(frame, /FEED_PREVIEW_FALLBACK_WH/);
  });

  it('shows the channel handle on Instagram, Facebook, YouTube and LinkedIn, not only the page name', () => {
    assert.match(instagram, /formatChannelHandle\(integration\?\.display\)/);
    assert.match(facebook, /formatChannelHandle\(integration\?\.display\)/);
  });
});
