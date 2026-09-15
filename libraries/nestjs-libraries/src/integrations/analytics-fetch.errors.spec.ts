import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyticsFetchNeedsReconnect } from './analytics-fetch.errors.ts';

describe('analyticsFetchNeedsReconnect', () => {
  it('is false for an empty successful series', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({ json: JSON.stringify({ data: [] }) }),
      false
    );
  });

  it('is true for HTTP 401 / 403', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({ json: '{}', httpStatus: 401 }),
      true
    );
    assert.equal(
      analyticsFetchNeedsReconnect({ json: '{}', httpStatus: 403 }),
      true
    );
  });

  it('is true for Graph OAuth error 190', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({
        json: '{"error":{"code":190}}',
        graphError: {
          code: 190,
          type: 'OAuthException',
          message: 'Invalid OAuth access token',
        },
      }),
      true
    );
  });

  it('is true when handleErrors classified a token error', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({
        json: '{"error":{"message":"Error validating access token"}}',
        handleErrorType: 'refresh-token',
      }),
      true
    );
  });

  it('is false for an invalid-metric Graph error', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({
        json: '{"error":{"code":100,"message":"not a valid metric"}}',
        graphError: {
          code: 100,
          message: '(#100) page_impressions_unique is not a valid metric',
        },
      }),
      false
    );
  });

  it('is false when Instagram insights need a Business account, not a new login', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({
        json: '{"error":{"message":"The user is not an Instagram Business"}}',
        handleErrorType: 'refresh-token',
        graphError: {
          message: 'The user is not an Instagram Business',
        },
      }),
      false
    );
  });

  it('is true for a revoked Meta token string', () => {
    assert.equal(
      analyticsFetchNeedsReconnect({
        json: '{"error":{"message":"REVOKED_ACCESS_TOKEN"}}',
      }),
      true
    );
  });
});
