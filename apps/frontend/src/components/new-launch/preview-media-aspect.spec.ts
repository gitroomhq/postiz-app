import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FEED_PREVIEW_FALLBACK_WH,
  FEED_PREVIEW_MAX_WH,
  FEED_PREVIEW_MIN_WH,
  REEL_FEED_PREVIEW_WH,
  STORY_PREVIEW_WH,
  clampPreviewAspect,
  feedPreviewAspect,
  instagramFeedPreviewRange,
  postHasPreview,
} from './preview-media-aspect.ts';

describe('feedPreviewAspect', () => {
  it('keeps a square file square in the feed, without forcing 1:1 as the default', () => {
    assert.equal(feedPreviewAspect(1080, 1080), 1);
    assert.equal(FEED_PREVIEW_FALLBACK_WH, FEED_PREVIEW_MIN_WH);
    assert.notEqual(FEED_PREVIEW_FALLBACK_WH, 1);
  });

  it('keeps Instagram 4:5 portrait', () => {
    assert.equal(feedPreviewAspect(1080, 1350), FEED_PREVIEW_MIN_WH);
  });

  it('crops a 3:4 still down to 4:5 on the Graph API feed', () => {
    assert.equal(feedPreviewAspect(1080, 1440), FEED_PREVIEW_MIN_WH);
  });

  it('keeps 3:2 landscape in full — Instagram does not crop it to 4:5', () => {
    assert.equal(feedPreviewAspect(1500, 1000), 1.5);
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

describe('postHasPreview', () => {
  it('treats a photo-only post as previewable', () => {
    assert.equal(postHasPreview({ content: '', media: [{ id: '1' }] }), true);
    assert.equal(postHasPreview({ content: '', image: [{ id: '1' }] }), true);
    assert.equal(postHasPreview({ content: '', media: [] }), false);
    assert.equal(postHasPreview({ content: 'hello' }), true);
  });
});

describe('clampPreviewAspect', () => {
  it('locks stories to 9:16', () => {
    assert.equal(
      clampPreviewAspect(1080, 1080, STORY_PREVIEW_WH, STORY_PREVIEW_WH),
      STORY_PREVIEW_WH
    );
  });

  it('does not snap missing sizes to square', () => {
    assert.equal(Number.isFinite(feedPreviewAspect(0, 1080)), false);
  });
});

describe('instagramFeedPreviewRange', () => {
  it('locks a single mp4 to the 4:5 Reel-in-feed crop', () => {
    assert.deepEqual(
      instagramFeedPreviewRange({ isStory: false, paths: ['clip.mp4'] }),
      {
        minWH: REEL_FEED_PREVIEW_WH,
        maxWH: REEL_FEED_PREVIEW_WH,
        fallbackWH: REEL_FEED_PREVIEW_WH,
      }
    );
  });

  it('lets a still or carousel measure inside 4:5 … 1.91:1', () => {
    assert.deepEqual(
      instagramFeedPreviewRange({ isStory: false, paths: ['photo.jpg'] }),
      {
        minWH: FEED_PREVIEW_MIN_WH,
        maxWH: FEED_PREVIEW_MAX_WH,
        fallbackWH: FEED_PREVIEW_FALLBACK_WH,
      }
    );
    assert.deepEqual(
      instagramFeedPreviewRange({
        isStory: false,
        paths: ['one.jpg', 'two.mp4'],
      }),
      {
        minWH: FEED_PREVIEW_MIN_WH,
        maxWH: FEED_PREVIEW_MAX_WH,
        fallbackWH: FEED_PREVIEW_FALLBACK_WH,
      }
    );
  });

  it('locks stories to 9:16 even for video', () => {
    assert.deepEqual(
      instagramFeedPreviewRange({ isStory: true, paths: ['clip.mp4'] }),
      {
        minWH: STORY_PREVIEW_WH,
        maxWH: STORY_PREVIEW_WH,
        fallbackWH: STORY_PREVIEW_WH,
      }
    );
  });
});
