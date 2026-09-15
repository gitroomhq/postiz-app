import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyticsHasActivity,
  analyticsResponseNeedsRefresh,
  mergeWorkspaceCharts,
  workspaceChartBucket,
} from './analytics-activity.ts';

describe('analyticsHasActivity', () => {
  it('is false for an empty successful list', () => {
    assert.equal(analyticsHasActivity([]), false);
  });

  it('is false when every series is empty or zero', () => {
    assert.equal(
      analyticsHasActivity([
        { data: [] },
        {
          data: [
            { total: 0 },
            { total: '0' },
          ],
        },
      ]),
      false
    );
  });

  it('is true when any point is non-zero', () => {
    assert.equal(
      analyticsHasActivity([
        {
          data: [{ total: 0 }, { total: 3 }],
        },
      ]),
      true
    );
  });
});

describe('analyticsResponseNeedsRefresh', () => {
  it('is false for a successful list, including an empty period', () => {
    assert.equal(analyticsResponseNeedsRefresh([]), false);
    assert.equal(
      analyticsResponseNeedsRefresh([{ label: 'Reach', data: [] }]),
      false
    );
  });

  it('is true only for the analytics reconnect HTTP body', () => {
    assert.equal(
      analyticsResponseNeedsRefresh({
        message: 'This channel needs to be refreshed',
        statusCode: 400,
      }),
      true
    );
  });

  it('is false for other error bodies and posting refreshNeeded leftovers', () => {
    assert.equal(analyticsResponseNeedsRefresh(undefined), false);
    assert.equal(
      analyticsResponseNeedsRefresh({
        message: 'Internal server error',
        statusCode: 500,
      }),
      false
    );
  });
});

describe('workspaceChartBucket', () => {
  it('maps channel labels without provider checks', () => {
    assert.equal(workspaceChartBucket('Search impressions'), 'impressions');
    assert.equal(workspaceChartBucket('Views'), 'impressions');
    assert.equal(workspaceChartBucket('Reach'), 'impressions');
    assert.equal(workspaceChartBucket('Reactions'), 'engagement');
    assert.equal(workspaceChartBucket('Pin clicks'), 'engagement');
    assert.equal(workspaceChartBucket('Direction requests'), 'engagement');
    assert.equal(workspaceChartBucket('Subscribers'), 'audience');
    assert.equal(workspaceChartBucket('Followers'), 'audience');
    assert.equal(workspaceChartBucket('Desktop Map Views'), 'impressions');
    assert.equal(workspaceChartBucket('Phone Calls'), 'engagement');
    assert.equal(workspaceChartBucket('Website Clicks'), 'engagement');
  });
});

describe('mergeWorkspaceCharts', () => {
  it('sums matching series by date and drops empty buckets', () => {
    const merged = mergeWorkspaceCharts([
      {
        label: 'Impressions',
        data: [
          { date: '2026-09-01', total: 10 },
          { date: '2026-09-02', total: 20 },
        ],
      },
      {
        label: 'Views',
        data: [{ date: '2026-09-01', total: 5 }],
      },
      {
        label: 'Followers',
        data: [{ date: '2026-09-01', total: 100 }],
      },
      {
        label: 'Engagement rate',
        average: true,
        data: [{ date: '2026-09-01', total: 2.4 }],
      },
    ]);
    assert.deepEqual(
      merged.map((row) => row.key),
      ['impressions', 'audience']
    );
    assert.deepEqual(merged[0].data, [
      { date: '2026-09-01', total: 15 },
      { date: '2026-09-02', total: 20 },
    ]);
  });
});
