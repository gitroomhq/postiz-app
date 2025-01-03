import { sign, verify } from 'jsonwebtoken';
import { hashSync, compareSync } from 'bcrypt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

// encryption algorithm
const algorithm = 'aes-256-ctr';

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
    // create a cipher object
    const iv = new Buffer(crypto.randomBytes(16));
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(process.env.JWT_SECRET), iv);

    // encrypt the plain text
    let encrypted = cipher.update(value);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ":" + encrypted.toString('hex');
  }

  static fixedDecryption(hash: string) {
    // create decipher object
    let textParts = hash.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(process.env.JWT_SECRET, 'hex'), iv);

    // decrypt the text
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  }
}
