import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GetAnalyticsPostsDto } from './get.analytics.posts.dto.ts';
import { toOptionalInt } from './optional-int.ts';

describe('toOptionalInt', () => {
  it('leaves missing query params unset so DTO defaults apply', () => {
    assert.equal(toOptionalInt(undefined), undefined);
    assert.equal(toOptionalInt(null), undefined);
    assert.equal(toOptionalInt(''), undefined);
  });

  it('parses numeric strings from the query string', () => {
    assert.equal(toOptionalInt('30'), 30);
    assert.equal(toOptionalInt('0'), 0);
  });

  it('keeps malformed numbers present so validation rejects them', () => {
    assert.equal(Number.isNaN(toOptionalInt('nope')), true);
    assert.equal(Number.isNaN(toOptionalInt('12junk')), true);
    assert.equal(Number.isNaN(toOptionalInt(Number.NaN)), true);
  });
});

describe('GetAnalyticsPostsDto', () => {
  it('transforms valid query strings into bounded numbers', async () => {
    const dto = plainToInstance(GetAnalyticsPostsDto, {
      date: '7',
      page: '0',
      limit: '20',
      sort: 'engagement',
      dir: 'desc',
    });
    assert.deepEqual(await validate(dto), []);
    assert.equal(dto.date, 7);
    assert.equal(dto.page, 0);
    assert.equal(dto.limit, 20);
  });

  it('rejects out-of-range pagination, dates, and unknown sorting', async () => {
    const dto = plainToInstance(GetAnalyticsPostsDto, {
      date: '91',
      page: '-1',
      limit: '101',
      sort: 'opaque-platform-score',
    });
    const invalid = new Set((await validate(dto)).map((error) => error.property));
    assert.deepEqual(
      invalid,
      new Set(['date', 'page', 'limit', 'sort'])
    );
  });

  it('rejects partially numeric query strings instead of truncating them', async () => {
    const dto = plainToInstance(GetAnalyticsPostsDto, {
      date: '12junk',
    });
    const invalid = new Set((await validate(dto)).map((error) => error.property));
    assert.deepEqual(invalid, new Set(['date']));
  });
});
