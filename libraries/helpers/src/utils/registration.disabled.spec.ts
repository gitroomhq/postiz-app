import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { isRegistrationDisabled } from './registration.disabled.ts';

describe('isRegistrationDisabled', () => {
  const previous = process.env.DISABLE_REGISTRATION;

  beforeEach(() => {
    delete process.env.DISABLE_REGISTRATION;
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.DISABLE_REGISTRATION;
    } else {
      process.env.DISABLE_REGISTRATION = previous;
    }
  });

  it('is open unless DISABLE_REGISTRATION is the string true', () => {
    assert.equal(isRegistrationDisabled(), false);
    process.env.DISABLE_REGISTRATION = 'false';
    assert.equal(isRegistrationDisabled(), false);
    process.env.DISABLE_REGISTRATION = 'true';
    assert.equal(isRegistrationDisabled(), true);
  });
});
