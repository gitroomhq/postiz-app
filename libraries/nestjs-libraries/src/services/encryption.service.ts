import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { EncryptionInterface } from '@gitroom/nestjs-libraries/encryption/encryption.interface';
import { EmptyProvider } from '@gitroom/nestjs-libraries/encryption/empty.provider';
import { LocalProvider } from '@gitroom/nestjs-libraries/encryption/local.provider';
import { AwsKmsProvider } from '@gitroom/nestjs-libraries/encryption/aws.kms.provider';

// An encrypted value is stored as enc:v1:<key id>:<base64 of iv + data + tag>,
// anything without the prefix is a plain value that was stored before the
// encryption (or without it) and is used as it is
export const ENCRYPTED_PREFIX = 'enc:v1:';

// The columns of a channel (Integration) that are stored encrypted. They are
// encrypted when they are written and decrypted when a channel is read, so
// everything outside of the repositories only sees the plain tokens.
export const integrationEncryptedFields = ['token', 'refreshToken'] as const;
const algorithm = 'aes-256-gcm';
const ivLength = 12;
const tagLength = 16;

@Injectable()
export class EncryptionService implements OnModuleInit {
  encryptionProvider: EncryptionInterface;
  private _key?: Promise<{ id: string; value: Buffer }>;

  constructor() {
    this.encryptionProvider = this.selectProvider(
      process.env.ENCRYPTION_PROVIDER!
    );
    console.log('Encryption provider:', this.encryptionProvider.name);
    for (const key of this.encryptionProvider.validateEnvKeys) {
      if (!process.env[key]) {
        console.error(`Missing environment variable: ${key}`);
      }
    }
  }

  // A provider that cannot give its key has to stop the start, a service that
  // runs without the key cannot use any of the encrypted values
  async onModuleInit() {
    if (this.hasProvider()) {
      await this.loadKey();
    }
  }

  hasProvider() {
    return !(this.encryptionProvider instanceof EmptyProvider);
  }

  // ENCRYPTION_READ_ONLY keeps reading the encrypted values without encrypting
  // new ones, for the time that not all the services have the key yet
  canEncrypt() {
    return this.hasProvider() && process.env.ENCRYPTION_READ_ONLY !== 'true';
  }

  selectProvider(provider: string) {
    switch (provider) {
      case 'local':
        return new LocalProvider();
      case 'aws-kms':
        return new AwsKmsProvider();
      default:
        // a typo must not silently store everything plain
        if (provider) {
          throw new Error(`Unknown encryption provider: ${provider}`);
        }
        return new EmptyProvider();
    }
  }

  isEncrypted(value: string) {
    return value.startsWith(ENCRYPTED_PREFIX);
  }

  async encrypt(value: string) {
    if (!value) {
      return value;
    }

    // A new value never looks like an encrypted one. Stored as it is, it would
    // be decrypted on the next read: somebody holding a stolen encrypted token
    // could hand it in as their own token and get the real one back.
    if (this.isEncrypted(value)) {
      throw new Error('The value cannot start with the encryption prefix');
    }

    if (!this.canEncrypt()) {
      return value;
    }

    const key = await this.loadKey();
    const iv = randomBytes(ivLength);
    const cipher = createCipheriv(algorithm, key.value, iv);
    const data = Buffer.concat([
      iv,
      cipher.update(value, 'utf8'),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return `${ENCRYPTED_PREFIX}${key.id}:${data.toString('base64')}`;
  }

  async decrypt(value: string) {
    if (!value || !this.isEncrypted(value)) {
      return value;
    }

    const [id, data] = value.slice(ENCRYPTED_PREFIX.length).split(':');
    const key = await this.loadKey();
    if (id !== key.id) {
      throw new Error(
        `The value was encrypted with the key ${id}, but the key of the encryption provider is ${key.id}`
      );
    }

    const buffer = Buffer.from(data || '', 'base64');
    const decipher = createDecipheriv(
      algorithm,
      key.value,
      buffer.subarray(0, ivLength)
    );
    decipher.setAuthTag(buffer.subarray(buffer.length - tagLength));

    return Buffer.concat([
      decipher.update(buffer.subarray(ivLength, buffer.length - tagLength)),
      decipher.final(),
    ]).toString('utf8');
  }

  async encryptFields<T extends object>(row: T, fields: readonly (keyof T)[]) {
    return this.changeFields(row, fields, (value) => this.encrypt(value));
  }

  async decryptFields<T extends object>(row: T, fields: readonly (keyof T)[]) {
    return this.changeFields(row, fields, (value) => this.decrypt(value));
  }

  private async changeFields<T extends object>(
    row: T,
    fields: readonly (keyof T)[],
    change: (value: string) => Promise<string>
  ) {
    const changed = { ...row };
    for (const field of fields) {
      const value = changed[field];
      if (typeof value === 'string') {
        changed[field] = (await change(value)) as T[keyof T];
      }
    }

    return changed;
  }

  // The key is asked from the provider once, the id is a fingerprint of it
  // that tells which key encrypted a value without telling anything about it
  private loadKey() {
    if (!this._key) {
      this._key = this.encryptionProvider.getKey().then((value) => {
        if (value.length !== 32) {
          throw new Error(
            `The key of the ${this.encryptionProvider.name} encryption provider has to be 32 bytes, got ${value.length}`
          );
        }

        return {
          id: createHash('sha256').update(value).digest('hex').slice(0, 8),
          value,
        };
      });

      this._key.catch(() => {
        this._key = undefined;
      });
    }

    return this._key;
  }
}
