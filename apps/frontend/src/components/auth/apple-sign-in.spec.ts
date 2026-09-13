import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldShowAppleSignIn } from './apple-sign-in.ts';

describe('shouldShowAppleSignIn', () => {
  it('shows the Apple button only when a client id is set', () => {
    assert.equal(shouldShowAppleSignIn('com.postqueen.service'), true);
    assert.equal(shouldShowAppleSignIn(''), false);
    assert.equal(shouldShowAppleSignIn(null), false);
    assert.equal(shouldShowAppleSignIn(undefined), false);
  });
});
