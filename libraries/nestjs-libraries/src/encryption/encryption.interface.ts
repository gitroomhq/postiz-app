export interface EncryptionInterface {
  name: string;
  validateEnvKeys: string[];
  // The 256-bit key the values are encrypted with, it is only kept in memory
  getKey(): Promise<Buffer>;
}
