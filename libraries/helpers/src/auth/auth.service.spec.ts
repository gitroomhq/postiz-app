import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

// vitest/setup/node.setup.ts pins JWT_SECRET to this value, which the
// known-answer test below depends on.
const SECRET = 'postiz-test-secret';

describe('AuthService JWT', () => {
  it('round-trips a signed payload', () => {
    const token = AuthService.signJWT({ id: 'user-1' });

    expect(AuthService.verifyJWT(token)).toMatchObject({ id: 'user-1' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = AuthService.signJWT({ id: 'user-1' });
    process.env.JWT_SECRET = 'a-different-secret';

    try {
      expect(() => AuthService.verifyJWT(token)).toThrow();
    } finally {
      process.env.JWT_SECRET = SECRET;
    }
  });
});

describe('AuthService passwords', () => {
  it('verifies a correct password against its hash', () => {
    const hash = AuthService.hashPassword('correct horse battery staple');

    expect(AuthService.comparePassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', () => {
    const hash = AuthService.hashPassword('correct horse battery staple');

    expect(AuthService.comparePassword('wrong password', hash)).toBe(false);
  });

  it('produces a different hash each time (bcrypt salts)', () => {
    expect(AuthService.hashPassword('same')).not.toBe(AuthService.hashPassword('same'));
  });
});

describe('AuthService fixed encryption', () => {
  it('is deterministic for the same plaintext and secret', () => {
    // The IV is derived from JWT_SECRET rather than random, so ciphertext is
    // stable. Integration tokens are looked up by encrypted value, so this
    // property is load-bearing.
    expect(AuthService.fixedEncryption('hello world')).toBe(
      AuthService.fixedEncryption('hello world')
    );
  });

  it('matches a pinned known-answer vector', () => {
    // The single most valuable assertion in this file. An upgrade to Node's
    // crypto or to evp_bytestokey that changed the key/IV derivation would make
    // every token already stored in production undecryptable, and nothing else
    // in the codebase would notice.
    expect(process.env.JWT_SECRET).toBe(SECRET);
    expect(AuthService.fixedEncryption('hello world')).toBe(
      '7a4587c7977b49a082b080b7408551bb'
    );
  });

  it('round-trips a long unicode string', () => {
    const plaintext = `${'ünïcodé 🎉 '.repeat(100)}end`;

    expect(AuthService.fixedDecryption(AuthService.fixedEncryption(plaintext))).toBe(
      plaintext
    );
  });
});
