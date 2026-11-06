import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import crypto from 'crypto';
import type { User } from '@prisma/client';

export type UserTokenPurpose = 'session' | 'password-reset' | 'activation';
export type UserTokenClaims = {
  sub: string;
  purpose: UserTokenPurpose;
  credentialTag: string;
  jti: string;
  exp: number;
};
type TokenUser = Pick<
  User,
  'id' | 'password' | 'email' | 'providerName' | 'providerId'
>;
const userTokenLifetime: Record<UserTokenPurpose, number> = {
  // Match the existing login cookie lifetime; no silent one-hour logout.
  session: 365 * 24 * 60 * 60,
  'password-reset': 20 * 60,
  activation: 24 * 60 * 60,
};
// @ts-ignore
import EVP_BytesToKey from 'evp_bytestokey';
const algorithm = 'aes-256-cbc';
const { keyLength, ivLength } = crypto.getCipherInfo(algorithm);

function deriveLegacyKeyIv(secret: string) {
  const { keyLength, ivLength } = crypto.getCipherInfo(algorithm); // 32, 16
  const pass = Buffer.isBuffer(secret) ? secret : Buffer.from(secret ?? '', 'utf8');

  // evp_bytestokey: key length in **bits**, IV length in **bytes**
  const { key, iv } = EVP_BytesToKey(pass, null, keyLength * 8, ivLength, 'md5');

  if (key.length !== keyLength || iv.length !== ivLength) {
    throw new Error(`Derived wrong sizes (key=${key.length}, iv=${iv.length})`);
  }
  return { key, iv };
}

export function decrypt_legacy_using_IV(hexCiphertext: string) {
  const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const out = Buffer.concat([decipher.update(hexCiphertext, 'hex'), decipher.final()]);
  return out.toString('utf8');
}

export function encrypt_legacy_using_IV(utf8Plaintext: string) {
  const { key, iv } = deriveLegacyKeyIv(process.env.JWT_SECRET);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const out = Buffer.concat([cipher.update(utf8Plaintext, 'utf8'), cipher.final()]);
  return out.toString('hex');
}
export class AuthService {
  static validateUserTokenConfiguration() {
    const secret = process.env.JWT_SECRET;
    if (!secret?.trim()) {
      throw new Error('JWT_SECRET is required for user authentication');
    }
    return secret;
  }

  private static userTokenKey(purpose: UserTokenPurpose | 'credentials') {
    // Domain separation keeps legacy integration tokens and stored encryption
    // working without accepting their signatures at user-auth boundaries.
    return crypto
      .createHmac('sha256', this.validateUserTokenConfiguration())
      .update(`postiz:user-auth:v1:${purpose}`)
      .digest();
  }

  static userCredentialTag(user: TokenUser): string {
    // Never place the password hash itself in a readable JWT. Binding to the
    // current credentials also rejects a stale login racing a password reset.
    return crypto
      .createHmac('sha256', this.userTokenKey('credentials'))
      .update(
        JSON.stringify([
          user.id,
          user.password,
          user.email,
          user.providerName,
          user.providerId,
        ])
      )
      .digest('hex');
  }

  static issueUserToken(user: TokenUser, purpose: UserTokenPurpose) {
    const expiresAt = new Date(
      (Math.floor(Date.now() / 1000) + userTokenLifetime[purpose]) * 1000
    );
    const token = sign(
      {
        purpose,
        credentialTag: this.userCredentialTag(user),
        exp: expiresAt.getTime() / 1000,
      },
      this.userTokenKey(purpose),
      {
        algorithm: 'HS256',
        issuer: 'postiz',
        audience: purpose,
        subject: user.id,
        jwtid: crypto.randomUUID(),
      }
    );
    return { token, expiresAt, tokenHash: this.userTokenHash(token) };
  }

  static verifyUserToken(
    token: string,
    purpose: UserTokenPurpose
  ): UserTokenClaims {
    if (typeof token !== 'string') throw new Error('Invalid user token');
    const claims = verify(token, this.userTokenKey(purpose), {
      algorithms: ['HS256'],
      issuer: 'postiz',
      audience: purpose,
    });
    if (
      typeof claims === 'string' ||
      claims.purpose !== purpose ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      typeof claims.jti !== 'string' ||
      !claims.jti ||
      typeof claims.exp !== 'number' ||
      !Number.isFinite(claims.exp) ||
      typeof claims.credentialTag !== 'string' ||
      !/^[a-f0-9]{64}$/.test(claims.credentialTag)
    ) {
      throw new Error('Invalid user token');
    }
    return {
      sub: claims.sub,
      purpose,
      jti: claims.jti,
      exp: claims.exp,
      credentialTag: claims.credentialTag,
    };
  }

  static userTokenHash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static hashPassword(password: string) {
    return hashSync(password, 10);
  }
  static comparePassword(password: string, hash: string) {
    return compareSync(password, hash);
  }
  static signJWT(value: object) {
    return sign(value, process.env.JWT_SECRET!);
  }
  static verifyJWT(token: string) {
    return verify(token, process.env.JWT_SECRET!);
  }

  static fixedEncryption(value: string) {
    return encrypt_legacy_using_IV(value);
  }

  static fixedDecryption(hash: string) {
    return decrypt_legacy_using_IV(hash);
  }
}
