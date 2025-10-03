import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class AuthService {
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

  private static deriveKey(key: string) {
    return Buffer.from(
      crypto.hkdfSync(
        'sha256',
        key,
        Buffer.alloc(0),
        'FIXED-CRYPTO-FOR-SOME-REASON???',
        32
      )
    );
  }

  static fixedEncryption(value: string) {
    // encryption algorithm
    const algorithm = 'aes-256-cbc';

    // derive a key of the correct length
    // (assuming the JWT secret is high entropy, making the use of HKDF okay)
    const key = AuthService.deriveKey(process.env.JWT_SECRET);

    // create a cipher object
    const iv = Buffer.alloc(16); // just as secure as the whole idea of using unauthenticated CBC crypto
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    // encrypt the plain text
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  static fixedDecryption(hash: string) {
    const algorithm = 'aes-256-cbc';
    const key = AuthService.deriveKey(process.env.JWT_SECRET);
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.alloc(16));

    // decrypt the encrypted text
    let decrypted = decipher.update(hash, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
