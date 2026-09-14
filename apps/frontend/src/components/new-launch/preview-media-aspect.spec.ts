import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FEED_PREVIEW_MAX_WH,
  FEED_PREVIEW_MIN_WH,
  STORY_PREVIEW_WH,
  clampPreviewAspect,
  feedPreviewAspect,
} from './preview-media-aspect.ts';

describe('feedPreviewAspect', () => {
  it('keeps a square file square', () => {
    assert.equal(feedPreviewAspect(1080, 1080), 1);
  });

  it('keeps Instagram 4:5 portrait', () => {
    assert.equal(feedPreviewAspect(1080, 1350), FEED_PREVIEW_MIN_WH);
  });

  it('crops a story-tall 9:16 still down to 4:5 on the feed', () => {
    assert.equal(feedPreviewAspect(1080, 1920), FEED_PREVIEW_MIN_WH);
  });

  it('keeps 16:9 under the 1.91 landscape cap', () => {
    assert.equal(feedPreviewAspect(1920, 1080), 1920 / 1080);
  });

  it('caps ultra-wide images at 1.91:1', () => {
    assert.equal(feedPreviewAspect(2000, 1000), FEED_PREVIEW_MAX_WH);
  });
});

describe('clampPreviewAspect', () => {
  it('locks stories to 9:16', () => {
    assert.equal(
      clampPreviewAspect(1080, 1080, STORY_PREVIEW_WH, STORY_PREVIEW_WH),
      STORY_PREVIEW_WH
    );
  });

  it('falls back to square when the size is missing', () => {
    assert.equal(feedPreviewAspect(0, 1080), 1);
  });
});
