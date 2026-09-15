import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyticsPublishDateRange,
  firstMediaPath,
  hasStaleAnalyticsTargets,
  mapSnapshotRow,
  matchesAnalyticsQuery,
  previewText,
  sortAnalyticsPosts,
  sumComplete,
  sumKnown,
  summarizeAnalyticsPosts,
  topAnalyticsPosts,
  type AnalyticsPostRow,
} from './post-metrics.query.ts';

const row = (
  partial: Partial<AnalyticsPostRow> & { id: string },
): AnalyticsPostRow => ({
  content: '',
  thumbnail: null,
  publishDate: '2026-09-01T10:00:00.000Z',
  releaseURL: null,
  integrationId: 'int-1',
  platform: 'x',
  channelName: 'PostQueen',
  channelPicture: null,
  impressions: null,
  reactions: null,
  comments: null,
  shares: null,
  engagementRate: null,
  previous: null,
  ...partial,
});

describe('previewText', () => {
  it('strips tags and truncates', () => {
    assert.equal(
      previewText('<p>Hello <strong>world</strong></p>'),
      'Hello world',
    );
    assert.equal(previewText('a'.repeat(10), 8), 'aaaaaaaa…');
  });
});

describe('matchesAnalyticsQuery', () => {
  const post = row({
    id: 'p1',
    content: '<p>Tuesday launch on X</p>',
    platform: 'x',
    channelName: 'PostQueen HQ',
  });

  it('filters by platform', () => {
    assert.equal(matchesAnalyticsQuery(post, undefined, 'x'), true);
    assert.equal(matchesAnalyticsQuery(post, undefined, 'instagram'), false);
  });

  it('finds posts by caption or channel', () => {
    assert.equal(matchesAnalyticsQuery(post, 'tuesday'), true);
    assert.equal(matchesAnalyticsQuery(post, 'HQ'), true);
    assert.equal(matchesAnalyticsQuery(post, 'p1'), true);
    assert.equal(matchesAnalyticsQuery(post, 'linkedin'), false);
  });
});

describe('sortAnalyticsPosts', () => {
  it('ranks unknown metrics last when sorting desc', () => {
    const sorted = sortAnalyticsPosts(
      [
        row({ id: 'a', reactions: null }),
        row({ id: 'b', reactions: 12 }),
        row({ id: 'c', reactions: 4 }),
      ],
      'reactions',
      'desc',
    );
    assert.deepEqual(
      sorted.map((p) => p.id),
      ['b', 'c', 'a'],
    );
  });

  it('never ranks posts whose selected metric is unknown', () => {
    const top = topAnalyticsPosts(
      [
        row({ id: 'a', reactions: null }),
        row({ id: 'b', reactions: 12 }),
        row({ id: 'c', reactions: 4 }),
      ],
      'reactions',
    );
    assert.deepEqual(
      top.map((post) => post.id),
      ['b', 'c'],
    );
  });

  it('keeps unknown metrics last when sorting ascending', () => {
    const sorted = sortAnalyticsPosts(
      [
        row({ id: 'unknown', comments: null }),
        row({ id: 'high', comments: 12 }),
        row({ id: 'low', comments: 4 }),
      ],
      'comments',
      'asc',
    );
    assert.deepEqual(
      sorted.map((post) => post.id),
      ['low', 'high', 'unknown'],
    );
  });
});

describe('analyticsPublishDateRange', () => {
  it('covers exactly the selected UTC calendar dates, including today', () => {
    const range = analyticsPublishDateRange(
      7,
      new Date('2026-09-15T16:00:00.000Z'),
    );
    assert.equal(range.from.toISOString(), '2026-09-09T00:00:00.000Z');
    assert.equal(range.to.toISOString(), '2026-09-15T23:59:59.999Z');
  });
});

describe('firstMediaPath', () => {
  it('prefers thumbnail then path', () => {
    assert.equal(
      firstMediaPath(
        JSON.stringify([{ path: '/full.jpg', thumbnail: '/thumb.jpg' }]),
      ),
      '/thumb.jpg',
    );
    assert.equal(
      firstMediaPath(JSON.stringify([{ path: '/full.jpg' }])),
      '/full.jpg',
    );
  });

  it('returns null for missing or invalid image json', () => {
    assert.equal(firstMediaPath(null), null);
    assert.equal(firstMediaPath('not-json'), null);
    assert.equal(firstMediaPath('[]'), null);
  });
});

describe('mapSnapshotRow', () => {
  const base = {
    id: 'p1',
    content: '<p>Hello</p>',
    image: JSON.stringify([{ path: '/a.jpg' }]),
    publishDate: new Date('2026-09-01T10:00:00.000Z'),
    releaseURL: 'https://x.com/1',
    integrationId: 'int-1',
    integration: {
      providerIdentifier: 'x',
      name: 'PostQueen',
      picture: null,
    },
  };

  it('keeps unknown metrics null and hides rates with unknown comments', () => {
    const mapped = mapSnapshotRow({
      ...base,
      postMetricSnapshots: [
        {
          impressions: 1000,
          reactions: 50,
          comments: null,
          shares: null,
        },
      ],
    });
    assert.equal(mapped.comments, null);
    assert.equal(mapped.engagementRate, null);
    assert.equal(mapped.thumbnail, '/a.jpg');
  });

  it('is null when impressions are missing even if reactions exist', () => {
    const mapped = mapSnapshotRow({
      ...base,
      postMetricSnapshots: [
        {
          impressions: null,
          reactions: 50,
          comments: 2,
          shares: null,
        },
      ],
    });
    assert.equal(mapped.engagementRate, null);
  });
});

describe('sumKnown', () => {
  it('returns null when every value is unknown', () => {
    assert.equal(
      sumKnown([row({ id: 'a' }), row({ id: 'b' })], (p) => p.comments),
      null,
    );
  });

  it('sums known values and ignores nulls', () => {
    assert.equal(
      sumKnown(
        [
          row({ id: 'a', reactions: 10 }),
          row({ id: 'b', reactions: null }),
          row({ id: 'c', reactions: 5 }),
        ],
        (p) => p.reactions,
      ),
      15,
    );
  });
});

describe('sumComplete', () => {
  it('returns null rather than presenting a partial mixed-provider total', () => {
    assert.equal(
      sumComplete(
        [
          row({ id: 'known', comments: 5 }),
          row({ id: 'facebook', comments: null }),
        ],
        (post) => post.comments
      ),
      null
    );
  });
});

describe('summarizeAnalyticsPosts', () => {
  it('uses every filtered post rather than only the visible page', () => {
    const rows = [
      row({
        id: 'a',
        integrationId: 'one',
        publishDate: '2026-09-14T10:00:00.000Z',
        impressions: 100,
        reactions: 10,
        comments: 2,
      }),
      row({
        id: 'b',
        integrationId: 'two',
        platform: 'instagram',
        channelName: 'IG',
        publishDate: '2026-09-15T10:00:00.000Z',
        impressions: 50,
        reactions: 5,
        comments: 1,
      }),
    ];
    const summary = summarizeAnalyticsPosts(rows);
    assert.equal(summary.impressions, 150);
    assert.equal(summary.channels.length, 2);
    assert.deepEqual(summary.weekdays, [1, 1, 0, 0, 0, 0, 0]);
    assert.deepEqual(summary.engagementMix, { reactions: 15, comments: 3 });
  });

  it('hides the engagement mix when any field is unknown', () => {
    const summary = summarizeAnalyticsPosts([
      row({ id: 'facebook', reactions: 10, comments: null }),
    ]);
    assert.equal(summary.reactions, 10);
    assert.equal(summary.comments, null);
    assert.equal(summary.engagementMix, null);
  });
});

describe('hasStaleAnalyticsTargets', () => {
  it('checks freshness per integration, including channels with no snapshot', () => {
    const now = new Date('2026-09-15T16:00:00.000Z').getTime();
    assert.equal(
      hasStaleAnalyticsTargets(
        [{ integrationId: 'fresh' }, { integrationId: 'missing' }],
        [
          {
            integrationId: 'fresh',
            capturedAt: new Date('2026-09-15T15:30:00.000Z'),
          },
        ],
        now,
        60 * 60 * 1000,
      ),
      true,
    );
    assert.equal(
      hasStaleAnalyticsTargets(
        [{ integrationId: 'fresh' }],
        [
          {
            integrationId: 'fresh',
            capturedAt: new Date('2026-09-15T15:30:00.000Z'),
          },
        ],
        now,
        60 * 60 * 1000,
      ),
      false,
    );
  });
});
