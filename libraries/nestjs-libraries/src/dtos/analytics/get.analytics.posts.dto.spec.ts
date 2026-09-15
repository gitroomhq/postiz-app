import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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

  it('does not turn garbage into NaN', () => {
    assert.equal(toOptionalInt('nope'), undefined);
    assert.equal(toOptionalInt(Number.NaN), undefined);
  });
});
