import { sign, decode } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthService, UserTokenPurpose } from './auth.service';

const secret = 'test-only-user-auth-secret-do-not-use-in-production';
const user = {
  id: 'test-user',
  email: 'test@example.invalid',
  password: 'test-hash',
  providerName: 'LOCAL' as const,
  providerId: null,
};
const purposes: UserTokenPurpose[] = [
  'session',
  'password-reset',
  'activation',
];

describe('user authentication token boundaries', () => {
  const previousSecret = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });
  afterAll(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });
  afterEach(() => jest.useRealTimers());

  it('requires configuration without forcing rotation of an existing encryption key', () => {
    try {
      delete process.env.JWT_SECRET;
      expect(() => AuthService.validateUserTokenConfiguration()).toThrow(
        'JWT_SECRET'
      );
      process.env.JWT_SECRET = 'existing-short-key';
      const ciphertext = AuthService.fixedEncryption(
        'test-provider-credential'
      );
      const { token } = AuthService.issueUserToken(user, 'session');
      expect(AuthService.verifyUserToken(token, 'session').sub).toBe(user.id);
      expect(AuthService.fixedDecryption(ciphertext)).toBe(
        'test-provider-credential'
      );
      expect(process.env.JWT_SECRET).toBe('existing-short-key');
    } finally {
      process.env.JWT_SECRET = secret;
    }
  });

  it('reproduces the legacy reset-as-session defect without real credentials', () => {
    const reset = AuthService.signJWT({
      id: user.id,
      expires: '2000-01-01 00:00:00',
    });
    // The old middleware accepted this signed ID even though the custom
    // reset deadline passed. The new session verifier must reject it.
    expect(AuthService.verifyJWT(reset)).toMatchObject({ id: user.id });
    expect(() => AuthService.verifyUserToken(reset, 'session')).toThrow();
  });

  it.each(purposes)('accepts %s only for its intended purpose', (purpose) => {
    const { token } = AuthService.issueUserToken(user, purpose);
    expect(AuthService.verifyUserToken(token, purpose).sub).toBe(user.id);
    for (const other of purposes.filter((value) => value !== purpose)) {
      expect(() => AuthService.verifyUserToken(token, other)).toThrow();
    }
    // Legacy integration verifiers cannot accept the new user tokens either.
    expect(() => AuthService.verifyJWT(token)).toThrow();
  });

  it.each(purposes)('enforces the standard expiry for %s', (purpose) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { token, expiresAt } = AuthService.issueUserToken(user, purpose);
    jest.setSystemTime(expiresAt);
    expect(() => AuthService.verifyUserToken(token, purpose)).toThrow();
  });

  it('rejects signed tokens missing expiry or required claims', () => {
    const key = crypto
      .createHmac('sha256', secret)
      .update('postiz:user-auth:v1:session')
      .digest();
    const valid = {
      sub: user.id,
      purpose: 'session',
      credentialTag: AuthService.userCredentialTag(user),
      jti: 'test-id',
      exp: Math.floor(Date.now() / 1000) + 60,
    };
    for (const field of ['sub', 'purpose', 'credentialTag', 'jti', 'exp']) {
      const payload: Record<string, unknown> = { ...valid };
      delete payload[field];
      const token = sign(payload, key, {
        algorithm: 'HS256',
        issuer: 'postiz',
        audience: 'session',
      });
      expect(() => AuthService.verifyUserToken(token, 'session')).toThrow();
    }
    for (const options of [
      { issuer: 'other', audience: 'session' },
      { issuer: 'postiz', audience: 'activation' },
    ]) {
      expect(() =>
        AuthService.verifyUserToken(sign(valid, key, options), 'session')
      ).toThrow();
    }
    expect(() =>
      AuthService.verifyUserToken(
        sign(valid, key, {
          algorithm: 'HS384',
          issuer: 'postiz',
          audience: 'session',
        }),
        'session'
      )
    ).toThrow();
  });

  it('does not include a password hash or profile and uses independent grant IDs', () => {
    const first = AuthService.issueUserToken(user, 'session');
    const second = AuthService.issueUserToken(user, 'session');
    expect(first.tokenHash).not.toBe(second.tokenHash);
    const payload = decode(first.token);
    expect(JSON.stringify(payload)).not.toContain(user.password);
    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('isSuperAdmin');
  });

  it('changes the credential binding even when the same plaintext password is rehashed', () => {
    const first = AuthService.hashPassword('same-password');
    const second = AuthService.hashPassword('same-password');
    expect(
      AuthService.userCredentialTag({ ...user, password: first })
    ).not.toBe(AuthService.userCredentialTag({ ...user, password: second }));
  });
});
