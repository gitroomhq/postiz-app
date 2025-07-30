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

  // Helper method to check if data is in legacy format
  static isLegacyFormat(hash: string): boolean {
    return !hash.includes(':');
  }

  // Helper method to migrate legacy encrypted data to new format
  static migrateLegacyData(legacyHash: string): string {
    if (!this.isLegacyFormat(legacyHash)) {
      return legacyHash; // Already in new format
    }
    
    try {
      const decrypted = this.fixedDecryption(legacyHash);
      return this.fixedEncryption(decrypted);
    } catch (error) {
      throw new Error(`Failed to migrate legacy data: ${error}`);
    }
  }

  static fixedEncryption(value: string) {
    // encryption algorithm
    const algorithm = 'aes-256-cbc';
    
    // Create a 32-byte key from the JWT_SECRET
    const key = crypto.scryptSync(process.env.JWT_SECRET!, 'salt', 32);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // create a cipher object
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    // encrypt the plain text
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (IV is needed for decryption)
    return iv.toString('hex') + ':' + encrypted;
  }

  static fixedDecryption(hash: string) {
    const algorithm = 'aes-256-cbc';
    
    // Check if this is new format (contains ':') or old format
    if (hash.includes(':')) {
      // New format with IV
      const key = crypto.scryptSync(process.env.JWT_SECRET!, 'salt', 32);
      
      const parts = hash.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else {
      // Legacy format - implement a compatible decryption method
      // This mimics the old createDecipher behavior using a derived key and IV
      try {
        const key = crypto.createHash('md5').update(process.env.JWT_SECRET!).digest();
        const iv = Buffer.alloc(16, 0); // createCipher used a zero IV
        
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(true);

        let decrypted = decipher.update(hash, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
      } catch (error) {
        throw new Error(`Cannot decrypt legacy format: ${error}. Please clear your database and restart.`);
      }
    }
  }
}
