import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
import { EncryptionInterface } from '@gitroom/nestjs-libraries/encryption/encryption.interface';

// Without ENCRYPTION_KMS_ACCESS_KEY the default AWS credential chain is used
// (AWS_* env vars, ECS task role, EC2 instance profile)
const kms = new KMSClient({
  region: process.env.ENCRYPTION_KMS_REGION,
  ...(process.env.ENCRYPTION_KMS_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.ENCRYPTION_KMS_ACCESS_KEY,
          secretAccessKey: process.env.ENCRYPTION_KMS_SECRET_ACCESS_KEY!,
        },
      }
    : {}),
});

export class AwsKmsProvider implements EncryptionInterface {
  name = 'aws-kms';
  validateEnvKeys = [
    'ENCRYPTION_KMS_REGION',
    'ENCRYPTION_KMS_DATA_KEY',
    ...(process.env.ENCRYPTION_KMS_ACCESS_KEY
      ? ['ENCRYPTION_KMS_SECRET_ACCESS_KEY']
      : []),
  ];
  // ENCRYPTION_KMS_DATA_KEY is the key encrypted by a KMS key (the
  // CiphertextBlob of generate-data-key-without-plaintext), so the key itself
  // is never stored anywhere and only KMS can give it back
  async getKey() {
    const { Plaintext } = await kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(
          process.env.ENCRYPTION_KMS_DATA_KEY || '',
          'base64'
        ),
      })
    );

    return Buffer.from(Plaintext!);
  }
}
