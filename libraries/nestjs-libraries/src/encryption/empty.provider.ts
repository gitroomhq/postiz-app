import { EncryptionInterface } from './encryption.interface';

export class EmptyProvider implements EncryptionInterface {
  name = 'no provider';
  validateEnvKeys: string[] = [];
  async getKey(): Promise<Buffer> {
    throw new Error(
      'No encryption provider found, set ENCRYPTION_PROVIDER to read the encrypted values'
    );
  }
}
