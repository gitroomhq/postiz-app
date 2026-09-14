import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyticsHasActivity } from './analytics-activity.ts';

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
