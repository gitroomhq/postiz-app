import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { S3Storage } from './s3.storage';

function validateEnvVars(vars: string[], provider: string): void {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${provider} storage: ${missing.join(', ')}`
    );
  }
}

export class UploadFactory {
  static createStorage(): IUploadProvider {
    const storageProvider = process.env.STORAGE_PROVIDER || 'local';

    switch (storageProvider) {
      case 'local':
        validateEnvVars(['UPLOAD_DIRECTORY'], 'local');
        return new LocalStorage(process.env.UPLOAD_DIRECTORY!);

      case 'cloudflare':
        validateEnvVars(
          [
            'CLOUDFLARE_ACCOUNT_ID',
            'CLOUDFLARE_ACCESS_KEY',
            'CLOUDFLARE_SECRET_ACCESS_KEY',
            'CLOUDFLARE_REGION',
            'CLOUDFLARE_BUCKETNAME',
            'CLOUDFLARE_BUCKET_URL',
          ],
          'cloudflare'
        );
        return new CloudflareStorage(
          process.env.CLOUDFLARE_ACCOUNT_ID!,
          process.env.CLOUDFLARE_ACCESS_KEY!,
          process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
          process.env.CLOUDFLARE_REGION!,
          process.env.CLOUDFLARE_BUCKETNAME!,
          process.env.CLOUDFLARE_BUCKET_URL!
        );

      case 's3':
        validateEnvVars(
          ['S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_REGION', 'S3_BUCKET'],
          's3'
        );
        return new S3Storage({
          endpoint: process.env.S3_ENDPOINT || undefined,
          accessKey: process.env.S3_ACCESS_KEY!,
          secretKey: process.env.S3_SECRET_KEY!,
          region: process.env.S3_REGION!,
          bucketName: process.env.S3_BUCKET!,
          bucketUrl: process.env.S3_BUCKET_URL || undefined,
        });

      default:
        throw new Error(`Invalid storage type ${storageProvider}`);
    }
  }
}
