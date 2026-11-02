import { CloudflareStorage } from './cloudflare.storage';
import { IUploadProvider } from './upload.interface';
import { LocalStorage } from './local.storage';
import { IMediaProcessor } from './media.processor.interface';
import { RunPodMediaProcessor } from './runpod.media.processor';
import {
  ClipJob,
  ClipResult,
  IngestJob,
  IngestResult,
} from './clipping.processor.interface';

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

  // Clipping hands presigned URLs to the ingest and clip endpoints and to the
  // transcriber, so it is only available on cloud storage as well
  static clippingEnabled() {
    return (
      process.env.STORAGE_PROVIDER === 'cloudflare' &&
      !!process.env.RUNPOD_API_KEY &&
      !!process.env.RUNPOD_INGEST_ENDPOINT_ID &&
      !!process.env.RUNPOD_CLIPPER_ENDPOINT_ID &&
      !!process.env.DEEPGRAM_API_KEY &&
      // the clips are picked by the model
      !!process.env.OPENAI_API_KEY
    );
  }

  static createIngestProcessor(): IMediaProcessor<
    IngestJob,
    IngestResult
  > | null {
    if (!UploadFactory.clippingEnabled()) {
      return null;
    }

    return new RunPodMediaProcessor<IngestJob, IngestResult>(
      process.env.RUNPOD_API_KEY!,
      process.env.RUNPOD_INGEST_ENDPOINT_ID!
    );
  }

  static createClipProcessor(): IMediaProcessor<ClipJob, ClipResult> | null {
    if (!UploadFactory.clippingEnabled()) {
      return null;
    }

    return new RunPodMediaProcessor<ClipJob, ClipResult>(
      process.env.RUNPOD_API_KEY!,
      process.env.RUNPOD_CLIPPER_ENDPOINT_ID!
    );
  }
}
