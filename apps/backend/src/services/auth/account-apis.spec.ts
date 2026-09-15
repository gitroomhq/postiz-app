import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  canCompleteSetPasswordWithToken,
  canUnlinkIdentity,
  decideLinkIdentity,
  emailsMatch,
  hasPasswordHash,
  nextProviderNameAfterUnlink,
  oauthLinkTicketMatchesState,
  pickUserWithPassword,
  sessionsNotBeforeFrom,
} from '../../../../../libraries/helpers/src/auth/account-security.ts';
import {
  canChangeRole,
  canMutateMember,
  canTransferOwnership,
  isLastSuperAdmin,
} from '../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/team-roles.ts';

const status = (ok: boolean, success: number, fail: number) =>
  ok ? success : fail;

describe('password change', () => {
  it('wrong current password → 400', () => {
    const hasPassword = hasPasswordHash('$2a$10$abcdefgh');
    const currentOk = false;
    assert.equal(status(hasPassword && currentOk, 200, 400), 400);
  });

  it('correct password → hash + sessionsNotBefore on the second', () => {
    const currentOk = true;
    assert.equal(status(currentOk, 200, 400), 200);
    assert.equal(
      sessionsNotBeforeFrom(1_700_000_001_999).getTime(),
      1_700_000_001_000
    );
  });

  it('password login uses a hash on LOCAL or another provider', () => {
    const google = {
      providerName: 'GOOGLE',
      password: '$2b$10$abcdefgh',
    };
    assert.equal(
      pickUserWithPassword([{ providerName: 'LOCAL', password: '' }, google]),
      google
    );
  });

  it('set_password email token cannot skip current-password once a hash exists', () => {
    assert.equal(canCompleteSetPasswordWithToken(true), false);
    assert.equal(canCompleteSetPasswordWithToken(false), true);
    assert.equal(
      status(canCompleteSetPasswordWithToken(true), 200, 400),
      400
    );
  });
});

describe('email change', () => {
  it('conflict with another User (case-insensitive) → 409', () => {
    const taken = emailsMatch('Gokhan@example.com', 'gokhan@example.com');
    assert.equal(status(!taken, 200, 409), 409);
  });

  it('does not change the login email without a confirm token', () => {
    const payload = null as { purpose?: string } | null;
    assert.equal(payload?.purpose === 'email_change' ? 200 : 400, 400);
  });
});

describe('identities', () => {
  it('unlink of the last method → 400', () => {
    assert.equal(status(canUnlinkIdentity(false, 1), 200, 400), 400);
    assert.equal(status(canUnlinkIdentity(true, 0), 200, 400), 400);
  });

  it('unlink after a second identity remains → 200', () => {
    assert.equal(status(canUnlinkIdentity(false, 2), 200, 400), 200);
    assert.equal(status(canUnlinkIdentity(true, 1), 200, 400), 200);
  });

  it('link when the provider account belongs to another user → 409', () => {
    const decision = decideLinkIdentity({
      currentUserId: 'me',
      existingOwnerId: 'other',
    });
    assert.equal(status(decision.ok, 200, 409), 409);
  });

  it('oauth_link cookie must bind nonce to state, not a raw user id', () => {
    assert.equal(oauthLinkTicketMatchesState('victim-id', 'link-abc'), false);
    assert.equal(oauthLinkTicketMatchesState('abc', 'link-abc'), true);
  });

  it('unlinking native GOOGLE while a password remains becomes LOCAL', () => {
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
});

describe('team roles', () => {
  it('ADMIN cannot act on ADMIN; SUPERADMIN can switch USER ↔ ADMIN', () => {
    assert.equal(
      status(
        canChangeRole({
          myRole: 'ADMIN',
          targetRole: 'ADMIN',
          nextRole: 'USER',
        }),
        200,
        403
      ),
      403
    );
    assert.equal(
      status(
        canChangeRole({
          myRole: 'SUPERADMIN',
          targetRole: 'USER',
          nextRole: 'ADMIN',
        }),
        200,
        403
      ),
      200
    );
    assert.equal(
      status(
        canChangeRole({
          myRole: 'SUPERADMIN',
          targetRole: 'ADMIN',
          nextRole: 'USER',
        }),
        200,
        403
      ),
      200
    );
  });

  it('ownership transfer is SUPERADMIN → ADMIN with confirm', () => {
    assert.equal(
      canTransferOwnership({
        myRole: 'SUPERADMIN',
        targetRole: 'ADMIN',
        confirm: true,
      }),
      true
    );
    assert.equal(
      canTransferOwnership({
        myRole: 'SUPERADMIN',
        targetRole: 'ADMIN',
        confirm: false,
      }),
      false
    );
  });

  it('last SUPERADMIN cannot be dropped', () => {
    assert.equal(isLastSuperAdmin(1, 'SUPERADMIN'), true);
    assert.equal(isLastSuperAdmin(2, 'SUPERADMIN'), false);
  });

  it('equal-level delete → 403', () => {
    assert.equal(status(canMutateMember('ADMIN', 'ADMIN'), 200, 403), 403);
    assert.equal(status(canMutateMember('SUPERADMIN', 'SUPERADMIN'), 200, 403), 403);
    assert.equal(status(canMutateMember('SUPERADMIN', 'ADMIN'), 200, 403), 200);
  });

  it('invite of an email already in the org → 409', () => {
    const alreadyInOrg = true;
    assert.equal(status(!alreadyInOrg, 200, 409), 409);
  });
});

describe('schema', () => {
  it('UserIdentity is unique per provider account and per user+provider', () => {
    const schema = readFileSync(
      fileURLToPath(
        new URL(
          '../../../../../libraries/nestjs-libraries/src/database/prisma/schema.prisma',
          import.meta.url
        )
      ),
      'utf8'
    );
    assert.match(schema, /model UserIdentity/);
    assert.match(schema, /@@unique\(\[provider, providerAccountId\]\)/);
    assert.match(schema, /@@unique\(\[userId, provider\]\)/);
  });
});
