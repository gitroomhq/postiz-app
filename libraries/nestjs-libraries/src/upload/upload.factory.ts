import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { IMediaProcessor } from './media.processor.interface';
import { RunPodMediaProcessor } from './runpod.media.processor';

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
      default:
        throw new Error(`Invalid storage type ${storageProvider}`);
    }
  }

  // Normalization needs presigned URLs, so it is only available on cloud storage
  static processorEnabled() {
    return (
      process.env.STORAGE_PROVIDER === 'cloudflare' &&
      !!process.env.RUNPOD_API_KEY &&
      !!process.env.RUNPOD_ENDPOINT_ID
    );
  }

  static createProcessor(): IMediaProcessor | null {
    if (!UploadFactory.processorEnabled()) {
      return null;
    }

    return new RunPodMediaProcessor(
      process.env.RUNPOD_API_KEY!,
      process.env.RUNPOD_ENDPOINT_ID!
    );
  }
}
