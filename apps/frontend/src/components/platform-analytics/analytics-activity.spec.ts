import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  analyticsHasActivity,
  analyticsResponseIsFailure,
  analyticsResponseNeedsRefresh,
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

describe('analyticsResponseIsFailure', () => {
  it('keeps reconnect responses actionable and rejects unrelated HTTP errors', () => {
    assert.equal(
      analyticsResponseIsFailure(false, {
        message: 'This channel needs to be refreshed',
      }),
      false,
    );
    assert.equal(
      analyticsResponseIsFailure(false, {
        message: 'Internal server error',
      }),
      true,
    );
    assert.equal(analyticsResponseIsFailure(true, []), false);
  });
});
