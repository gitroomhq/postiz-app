import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import crypto from 'crypto';
import EVP_BytesToKey from 'evp_bytestokey';
const KEY_SIZE = 24;
const algorithm = 'aes-256-cbc';

function decrypt_legacy_using_IV(text) {
  const result = EVP_BytesToKey(
    process.env.JWT_SECRET,
    null,
    KEY_SIZE * 8, // byte to bit size
    16
  );

  const decipher = crypto.createDecipheriv(algorithm, result.key, result.iv);
  const decrypted = decipher.update(text, 'hex', 'utf8') + decipher.final('utf8');
  return decrypted.toString();
}

function encrypt_legacy_using_IV(text) {
  const result = EVP_BytesToKey(
    process.env.JWT_SECRET,
    null,
    KEY_SIZE * 8, // byte to bit size
    16
  );

  const cipher = crypto.createCipheriv(algorithm, result.key, result.iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return encrypted.toString();
}

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

  static fixedEncryption(value: string) {
    return encrypt_legacy_using_IV(value);
  }

  static fixedDecryption(hash: string) {
    return decrypt_legacy_using_IV(hash);
  }
}
