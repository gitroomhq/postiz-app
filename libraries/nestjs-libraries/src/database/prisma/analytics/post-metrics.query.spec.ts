import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  firstMediaPath,
  mapSnapshotRow,
  matchesAnalyticsQuery,
  previewText,
  sortAnalyticsPosts,
  sumKnown,
  type AnalyticsPostRow,
} from './post-metrics.query.ts';

const row = (
  partial: Partial<AnalyticsPostRow> & { id: string }
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
    assert.equal(previewText('<p>Hello <strong>world</strong></p>'), 'Hello world');
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
      'desc'
    );
    assert.deepEqual(
      sorted.map((p) => p.id),
      ['b', 'c', 'a']
    );
  });
});

describe('firstMediaPath', () => {
  it('prefers thumbnail then path', () => {
    assert.equal(
      firstMediaPath(
        JSON.stringify([{ path: '/full.jpg', thumbnail: '/thumb.jpg' }])
      ),
      '/thumb.jpg'
    );
    assert.equal(firstMediaPath(JSON.stringify([{ path: '/full.jpg' }])), '/full.jpg');
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

  it('keeps unknown metrics null and rates Facebook-style comments', () => {
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
    assert.equal(mapped.engagementRate, 5);
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
      sumKnown(
        [row({ id: 'a' }), row({ id: 'b' })],
        (p) => p.comments
      ),
      null
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
        (p) => p.reactions
      ),
      15
    );
  });
});
