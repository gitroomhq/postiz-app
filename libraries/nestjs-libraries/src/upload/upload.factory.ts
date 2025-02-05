import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { S3Storage } from './awss3.storage';

export class UploadFactory {
  static createStorage(): IUploadProvider {
    const storageProvider = process.env.STORAGE_PROVIDER || 'local';

    switch (storageProvider) {
      case 'local':
        return new LocalStorage(process.env.UPLOAD_DIRECTORY!);
      case 'cloudflare':
        return new CloudflareStorage(
          process.env.CLOUDFLARE_ACCOUNT_ID!,
          process.env.CLOUDFLARE_ACCESS_KEY!,
          process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
          process.env.CLOUDFLARE_REGION!,
          process.env.CLOUDFLARE_BUCKETNAME!,
          process.env.CLOUDFLARE_BUCKET_URL!
        );
      case 'awss3':
        return new S3Storage(
          process.env.AWS_ACCESS_KEY_ID!,
          process.env.AWS_SECRET_ACCESS_KEY!,
          process.env.AWS_REGION!,
          process.env.AWS_BUCKET_NAME!,
          process.env.AWS_BUCKET_DIR!,
          process.env.AWS_BUCKET_URL!
        )
      default:
        throw new Error(`Invalid storage type ${storageProvider}`);
    }
  }
}