import {hash, compare} from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { createCipheriv, scrypt, createDecipheriv, randomBytes } from 'crypto';
import { promisify } from 'util';

@Injectable()
export class EncryptionService {
  generateApiKey() {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const keyLength = 32;
    let publicKey = '';
    let secretKey = '';

    for (let i = 0; i < keyLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      publicKey += characters[randomIndex];
      secretKey += characters[randomIndex];
    }

    return { publicKey: `pb_${publicKey}`, secretKey: `sk_${secretKey}` };
  }

  async encryptKey(apiKey: string, hash: string) {
    // The key length is dependent on the algorithm.
    // In this case for aes256, it is 32 bytes.
    const iv = randomBytes(16);
    const key = (await promisify(scrypt)(hash, 'salt', 32)) as Buffer;
    const cipher = createCipheriv('aes-256-ctr', key, iv);
    return (
      iv.toString('base64') +
      '_' +
      Buffer.concat([cipher.update(apiKey), cipher.final()]).toString('base64')
    );
  }

  async decryptKey(apiKey: string, hash: string) {
    const [iv, keySplit] = apiKey.split('_');
    const key = (await promisify(scrypt)(hash, 'salt', 32)) as Buffer;

    const decipher = createDecipheriv(
      'aes-256-ctr',
      key,
      Buffer.from(iv, 'base64')
    );
    const decryptedText = Buffer.concat([
      decipher.update(Buffer.from(keySplit, 'base64')),
      decipher.final(),
    ]);

    return decryptedText.toString();
  }

  async hashPassword(password: string) {
    return hash(password, 16);
  }
  async comparePassword(password: string, hash: string) {
    return compare(password, hash);
  }
}
