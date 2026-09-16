import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  asCount,
  engagementRate,
  hasKnownPostMetric,
  mapFacebookPostInsights,
  mapInstagramMediaInsights,
  mapLinkedInShareStats,
  mapPinterestLifetimeMetrics,
  mapThreadsInsights,
  mapTikTokBusinessVideoStats,
  mapTikTokVideoStats,
  mapXPublicMetrics,
  mapYouTubeVideoStatistics,
  sumXPublicMetrics,
} from './post-metrics.map.ts';

describe('asCount', () => {
  it('returns null for missing values', () => {
    assert.equal(asCount(undefined), null);
    assert.equal(asCount(null), null);
    assert.equal(asCount(''), null);
  });

  it('sums reaction-type objects', () => {
    assert.equal(asCount({ like: 3, love: 2, wow: 1 }), 6);
  });
});

describe('engagementRate', () => {
  it('is null without impressions', () => {
    assert.equal(engagementRate(null, 10, 2), null);
    assert.equal(engagementRate(0, 10, 2), null);
  });

  it('is null when both reactions and comments are unknown', () => {
    assert.equal(engagementRate(1000, null, null), null);
  });

  it('is null when either formula input is unknown', () => {
    assert.equal(engagementRate(1000, 50, null), null);
    assert.equal(engagementRate(1000, null, 2), null);
  });

  it('divides reactions plus comments by impressions', () => {
    assert.equal(engagementRate(1000, 70, 10), 8);
  });
});

describe('analytics metric completeness', () => {
  it('does not persist an all-null provider response over a good snapshot', () => {
    assert.equal(
      hasKnownPostMetric({
        platformPostId: 'missing',
        impressions: null,
        reactions: null,
        comments: null,
        shares: null,
      }),
      false
    );
  });

  it('sums only X fields that were actually returned', () => {
    assert.deepEqual(
      sumXPublicMetrics([
        { like_count: 3, reply_count: 1 },
        { like_count: 2, impression_count: 10 },
      ]),
      {
        impression_count: 10,
        like_count: 5,
        reply_count: 1,
      }
    );
  });
});

describe('platform field maps', () => {
  it('maps X public_metrics likes to reactions and replies to comments', () => {
    assert.deepEqual(
      mapXPublicMetrics('1', {
        impression_count: 1250,
        like_count: 40,
        reply_count: 3,
        retweet_count: 5,
        quote_count: 1,
        bookmark_count: 2,
      }),
      {
        platformPostId: '1',
        impressions: 1250,
        reactions: 40,
        comments: 3,
        shares: 5,
        raw: { quotes: 1, bookmarks: 2 },
      }
    );
  });

  it('maps LinkedIn share stats and falls back to socialActions', () => {
    assert.deepEqual(
      mapLinkedInShareStats(
        'urn:li:share:1',
        { impressionCount: 80, likeCount: 4, commentCount: 1, shareCount: 2 },
        null
      ),
      {
        platformPostId: 'urn:li:share:1',
        impressions: 80,
        reactions: 4,
        comments: 1,
        shares: 2,
        raw: undefined,
      }
    );
    assert.equal(
      mapLinkedInShareStats('urn:li:share:2', null, {
        likesSummary: { totalLikes: 9 },
        commentsSummary: { totalFirstLevelComments: 2 },
      }).reactions,
      9
    );
  });

  it('does not copy LinkedIn opaque engagement onto the row', () => {
    const mapped = mapLinkedInShareStats('urn:li:share:3', {
      impressionCount: 100,
      likeCount: 4,
      commentCount: 1,
      engagement: 0.05,
    });
    assert.equal(mapped.impressions, 100);
    assert.equal(mapped.reactions, 4);
    assert.equal((mapped as { engagement?: number }).engagement, undefined);
  });

  it('maps Instagram views to impressions', () => {
    const mapped = mapInstagramMediaInsights('ig1', [
      { name: 'views', values: [{ value: 200 }] },
      { name: 'likes', values: [{ value: 12 }] },
      { name: 'comments', values: [{ value: 4 }] },
      { name: 'shares', values: [{ value: 1 }] },
      { name: 'reach', values: [{ value: 180 }] },
      { name: 'saved', values: [{ value: 3 }] },
    ]);
    assert.equal(mapped.impressions, 200);
    assert.equal(mapped.reactions, 12);
    assert.equal(mapped.comments, 4);
    assert.equal(mapped.shares, 1);
    assert.equal(mapped.raw?.reach, 180);
  });

  it('leaves Facebook comments and shares null', () => {
    const mapped = mapFacebookPostInsights('fb1', [
      { name: 'post_total_media_view_unique', values: [{ value: 900 }] },
      {
        name: 'post_reactions_by_type_total',
        values: [{ value: { like: 10, love: 2 } }],
      },
      { name: 'post_clicks', values: [{ value: 7 }] },
    ]);
    assert.equal(mapped.impressions, 900);
    assert.equal(mapped.reactions, 12);
    assert.equal(mapped.comments, null);
    assert.equal(mapped.shares, null);
  });

  it('maps TikTok and TikTok Business view fields to impressions', () => {
    assert.equal(
      mapTikTokVideoStats('tt1', {
        view_count: 40,
        like_count: 5,
        comment_count: 1,
        share_count: 2,
      }).impressions,
      40
    );
    assert.equal(
      mapTikTokBusinessVideoStats('ttb1', {
        video_views: 99,
        likes: 8,
        comments: 3,
        shares: 1,
      }).impressions,
      99
    );
  });

  it('maps YouTube viewCount to impressions and leaves shares null', () => {
    const mapped = mapYouTubeVideoStatistics('yt1', {
      viewCount: '1000',
      likeCount: '20',
      commentCount: '4',
      favoriteCount: '0',
    });
    assert.equal(mapped.impressions, 1000);
    assert.equal(mapped.reactions, 20);
    assert.equal(mapped.comments, 4);
    assert.equal(mapped.shares, null);
  });

  it('maps Threads replies to comments', () => {
    const mapped = mapThreadsInsights('th1', [
      { name: 'views', total_value: { value: 50 } },
      { name: 'likes', values: [{ value: 6 }] },
      { name: 'replies', values: [{ value: 2 }] },
      { name: 'reposts', values: [{ value: 1 }] },
    ]);
    assert.equal(mapped.impressions, 50);
    assert.equal(mapped.comments, 2);
    assert.equal(mapped.shares, 1);
  });

  it('leaves Pinterest reactions and comments null', () => {
    const mapped = mapPinterestLifetimeMetrics('pin1', {
      IMPRESSION: 300,
      PIN_CLICK: 12,
      SAVE: 4,
    });
    assert.equal(mapped.impressions, 300);
    assert.equal(mapped.reactions, null);
    assert.equal(mapped.comments, null);
    assert.equal(mapped.shares, null);
    assert.equal(mapped.raw?.saves, 4);
  });
});
