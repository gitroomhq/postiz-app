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
    assert.match(instagram, /aspectRatio: '4 \/ 5'/);
    assert.doesNotMatch(instagram, /aspect-square/);
    assert.doesNotMatch(instagram, /fallbackWH=\{1\}/);
  });

  it('covers video the same way as stills, instead of stretching', () => {
    assert.match(videoOrImage, /playsInline/);
    assert.match(videoOrImage, /isContain \? 'object-contain' : 'object-cover'/);
    assert.match(frame, /FEED_PREVIEW_FALLBACK_WH/);
  });

  it('caps the media frame so a 4:5 card fits fully in the preview pane', () => {
    assert.match(frame, /PREVIEW_MEDIA_MAX_HEIGHT/);
    assert.match(frame, /min\(34vh, 300px\)/);
    assert.doesNotMatch(frame, /min\(48vh, 440px\)/);
    assert.match(
      frame,
      /width: `min\(100%, calc\(\$\{maxHeight\} \* \$\{displayWH\}\)\)`/
    );
  });

  it('keeps YouTube and TikTok previews in document flow so stacked cards can scroll fully', () => {
    const youtube = readFileSync(
      fileURLToPath(
        new URL('./providers/youtube/youtube.preview.tsx', import.meta.url)
      ),
      'utf8'
    );
    const tiktok = readFileSync(
      fileURLToPath(
        new URL('./providers/tiktok/tiktok.preview.tsx', import.meta.url)
      ),
      'utf8'
    );
    const pinterest = readFileSync(
      fileURLToPath(
        new URL('./providers/pinterest/pinterest.preview.tsx', import.meta.url)
      ),
      'utf8'
    );
    assert.doesNotMatch(youtube, /absolute left-0 top-0/);
    assert.doesNotMatch(tiktok, /absolute left-0 top-0/);
    assert.doesNotMatch(pinterest, /absolute left-0 top-0/);
    assert.match(youtube, /flex w-full flex-col/);
    assert.match(youtube, /PREVIEW_MEDIA_MAX_HEIGHT/);
    assert.match(tiktok, /max-h-\[min\(34vh,300px\)\]/);
  });

  it('shows the channel handle on Instagram, not only the page name', () => {
    assert.match(instagram, /formatChannelHandle\(integration\?\.display\)/);
  });
});
