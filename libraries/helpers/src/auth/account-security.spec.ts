import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canCompleteSetPasswordWithToken,
  canUnlinkIdentity,
  decideLinkIdentity,
  emailsMatch,
  hasPasswordHash,
  isLinkableProvider,
  nextProviderNameAfterUnlink,
  oauthLinkTicketMatchesState,
  pickUserWithPassword,
  sessionsNotBeforeFrom,
} from './account-security.ts';

describe('hasPasswordHash', () => {
  it('treats bcrypt hashes as a password and empty strings as none', () => {
    assert.equal(hasPasswordHash('$2a$10$abcdefgh'), true);
    assert.equal(hasPasswordHash('$2b$10$abcdefgh'), true);
    assert.equal(hasPasswordHash(''), false);
    assert.equal(hasPasswordHash(null), false);
    assert.equal(hasPasswordHash('not-a-hash'), false);
  });
});

describe('canUnlinkIdentity', () => {
  it('refuses unlinking the last login method', () => {
    assert.equal(canUnlinkIdentity(false, 1), false);
    assert.equal(canUnlinkIdentity(true, 0), false);
  });

  it('allows unlink when a password or another identity remains', () => {
    assert.equal(canUnlinkIdentity(true, 1), true);
    assert.equal(canUnlinkIdentity(false, 2), true);
  });
});

describe('decideLinkIdentity', () => {
  it('409s when the provider account belongs to another user', () => {
    assert.deepEqual(
      decideLinkIdentity({
        currentUserId: 'me',
        existingOwnerId: 'other',
      }),
      { ok: false, reason: 'taken' }
    );
  });

  it('is idempotent when this user already holds the account', () => {
    assert.deepEqual(
      decideLinkIdentity({
        currentUserId: 'me',
        existingOwnerId: 'me',
      }),
      { ok: true, reason: 'already' }
    );
  });

  it('refuses a second account for the same provider on this user', () => {
    assert.deepEqual(
      decideLinkIdentity({
        currentUserId: 'me',
        existingOwnerId: null,
        currentProviderOwnerId: 'me',
      }),
      { ok: false, reason: 'provider_taken' }
    );
  });

  it('creates when nobody holds it', () => {
    assert.deepEqual(
      decideLinkIdentity({
        currentUserId: 'me',
        existingOwnerId: null,
        currentProviderOwnerId: null,
      }),
      { ok: true, reason: 'create' }
    );
  });
});

describe('emailsMatch / isLinkableProvider', () => {
  it('compares emails case-insensitively', () => {
    assert.equal(emailsMatch('A@B.com', 'a@b.com'), true);
    assert.equal(emailsMatch('a@b.com', 'c@d.com'), false);
  });

  it('accepts OAuth providers and rejects LOCAL', () => {
    assert.equal(isLinkableProvider('GOOGLE'), true);
    assert.equal(isLinkableProvider('github'), true);
    assert.equal(isLinkableProvider('LOCAL'), false);
  });
});

describe('pickUserWithPassword', () => {
  it('prefers LOCAL with a hash, then any provider with a hash', () => {
    const localEmpty = {
      providerName: 'LOCAL',
      password: '',
    };
    const googleHashed = {
      providerName: 'GOOGLE',
      password: '$2a$10$abcdefgh',
    };
    assert.equal(pickUserWithPassword([localEmpty, googleHashed]), googleHashed);
    assert.equal(pickUserWithPassword([localEmpty]), null);
  });
});

describe('sessionsNotBeforeFrom', () => {
  it('rounds down to the second so JWT iat comparisons work', () => {
    assert.equal(sessionsNotBeforeFrom(1_700_000_001_234).getTime(), 1_700_000_001_000);
  });
});

describe('canCompleteSetPasswordWithToken', () => {
  it('allows the emailed token only when no hash exists', () => {
    assert.equal(canCompleteSetPasswordWithToken(false), true);
    assert.equal(canCompleteSetPasswordWithToken(true), false);
  });
});

describe('oauthLinkTicketMatchesState', () => {
  it('binds the ticket nonce to link-${nonce} and rejects swaps', () => {
    assert.equal(oauthLinkTicketMatchesState('abc123', 'link-abc123'), true);
    assert.equal(oauthLinkTicketMatchesState('abc123', 'link-other'), false);
    assert.equal(oauthLinkTicketMatchesState('abc123', 'login-abc123'), false);
    assert.equal(oauthLinkTicketMatchesState(undefined, 'link-abc123'), false);
    assert.equal(oauthLinkTicketMatchesState('user-id-raw', 'link-abc123'), false);
  });
});

describe('nextProviderNameAfterUnlink', () => {
  it('converts native GOOGLE to LOCAL when a password remains', () => {
    assert.equal(
      nextProviderNameAfterUnlink({
        nativeProvider: 'GOOGLE',
        unlinkedProvider: 'GOOGLE',
        hasPassword: true,
        remainingProviders: [],
      }),
      'LOCAL'
    );
  });

  it('keeps providerName when unlinking a non-native identity', () => {
    assert.equal(
      nextProviderNameAfterUnlink({
        nativeProvider: 'GOOGLE',
        unlinkedProvider: 'GITHUB',
        hasPassword: true,
        remainingProviders: ['GOOGLE'],
      }),
      null
    );
  });

  it('falls through to the next remaining identity without a password', () => {
    assert.equal(
      nextProviderNameAfterUnlink({
        nativeProvider: 'GOOGLE',
        unlinkedProvider: 'GOOGLE',
        hasPassword: false,
        remainingProviders: ['GITHUB'],
      }),
      'GITHUB'
    );
  });
});
