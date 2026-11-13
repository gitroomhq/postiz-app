import { EncryptionInterface } from '@gitroom/nestjs-libraries/encryption/encryption.interface';

export class LocalProvider implements EncryptionInterface {
  name = 'local';
  validateEnvKeys = ['ENCRYPTION_KEY'];
  // ENCRYPTION_KEY is the key itself in base64 (openssl rand -base64 32)
  async getKey() {
    return Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
  }
}
