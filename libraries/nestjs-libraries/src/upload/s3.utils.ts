export interface S3Config {
  endpoint?: string;
  bucketName: string;
  region: string;
  bucketUrl?: string;
}

/**
 * Construct the public bucket URL based on configuration
 * - If bucketUrl is provided, use it (for custom CDN/distribution)
 * - If endpoint is set (MinIO/custom S3), use path-style: endpoint/bucket
 * - If no endpoint (AWS S3), use virtual-hosted style: bucket.s3.region.amazonaws.com
 */
export function constructS3BucketUrl(config: S3Config): string {
  if (config.bucketUrl) {
    return config.bucketUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  if (config.endpoint) {
    // MinIO/custom S3: path-style URL
    const endpoint = config.endpoint.replace(/\/$/, '');
    return `${endpoint}/${config.bucketName}`;
  }

  // AWS S3: virtual-hosted style URL
  return `https://${config.bucketName}.s3.${config.region}.amazonaws.com`;
}

/**
 * Get S3 bucket URL from environment variables
 * Returns empty string if not using S3 provider
 */
export function getS3BucketUrlFromEnv(): string {
  if (process.env.STORAGE_PROVIDER !== 's3') {
    return '';
  }

  return constructS3BucketUrl({
    endpoint: process.env.S3_ENDPOINT,
    bucketName: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || '',
    bucketUrl: process.env.S3_BUCKET_URL,
  });
}

/**
 * Check if URL belongs to any of our storage providers
 */
export function isStorageUrl(url: string): boolean {
  if (!url) return false;

  const frontendUrl = process.env.FRONTEND_URL;
  const cloudflareUrl = process.env.CLOUDFLARE_BUCKET_URL;
  const s3BucketUrl = getS3BucketUrlFromEnv();

  // Check frontend URL (for local storage)
  if (frontendUrl && url.includes(frontendUrl)) {
    return true;
  }

  // Check Cloudflare R2 URL
  if (cloudflareUrl && url.includes(cloudflareUrl)) {
    return true;
  }

  // Check S3/MinIO URL
  if (s3BucketUrl && url.includes(s3BucketUrl)) {
    return true;
  }

  return false;
}

/**
 * Get the bucket URL for the current storage provider
 */
export function getCurrentBucketUrl(): string {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 's3':
      return getS3BucketUrlFromEnv();
    case 'cloudflare':
      return (process.env.CLOUDFLARE_BUCKET_URL || '').replace(/\/$/, '');
    case 'local':
      // Local storage uses FRONTEND_URL/uploads as the base URL
      return (process.env.FRONTEND_URL || '').replace(/\/$/, '') + '/uploads';
    default:
      return '';
  }
}
