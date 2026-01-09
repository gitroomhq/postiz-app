import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';
import { constructS3BucketUrl } from './s3.utils';

export interface S3StorageConfig {
  endpoint?: string; // Custom endpoint for MinIO, empty for AWS S3
  accessKey: string;
  secretKey: string;
  region: string;
  bucketName: string;
  bucketUrl?: string; // Optional: Public URL override (auto-generated if not provided)
}

export class S3Storage implements IUploadProvider {
  private _client: S3Client;
  private _bucketName: string;
  private _bucketUrl: string;

  constructor(config: S3StorageConfig) {
    this._bucketName = config.bucketName;
    this._bucketUrl = constructS3BucketUrl({
      endpoint: config.endpoint,
      bucketName: config.bucketName,
      region: config.region,
      bucketUrl: config.bucketUrl,
    });

    // Auto-detect forcePathStyle: if custom endpoint is set, use path-style (MinIO/custom S3)
    // If no endpoint (AWS S3), use virtual-hosted style
    const usePathStyle = !!config.endpoint;

    const clientConfig: {
      region: string;
      credentials: { accessKeyId: string; secretAccessKey: string };
      forcePathStyle?: boolean;
      endpoint?: string;
    } = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: usePathStyle,
    };

    // Only set endpoint for MinIO/custom S3-compatible services
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this._client = new S3Client(clientConfig);
  }

  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  async uploadSimple(path: string): Promise<string> {
    const loadImage = await fetch(path);
    const contentType =
      loadImage?.headers?.get('content-type') ||
      loadImage?.headers?.get('Content-Type');
    // Fallback to 'bin' if MIME type is unrecognized, or try to extract from URL
    const extension = getExtension(contentType) || path.split('.').pop()?.split('?')[0] || 'bin';
    const id = makeId(10);
    const datePath = this.getDatePath();
    const key = `${datePath}/${id}.${extension}`;

    const params = {
      Bucket: this._bucketName,
      Key: key,
      Body: Buffer.from(await loadImage.arrayBuffer()),
      ContentType: contentType,
      ACL: 'public-read' as const,
    };

    const command = new PutObjectCommand(params);
    await this._client.send(command);

    return `${this._bucketUrl}/${key}`;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const id = makeId(10);
      const extension = mime.extension(file.mimetype) || '';
      const datePath = this.getDatePath();
      const key = `${datePath}/${id}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this._bucketName,
        ACL: 'public-read',
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this._client.send(command);

      return {
        filename: `${id}.${extension}`,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        originalname: `${id}.${extension}`,
        fieldname: 'file',
        path: `${this._bucketUrl}/${key}`,
        destination: `${this._bucketUrl}/${key}`,
        encoding: '7bit',
        stream: file.buffer as any,
      };
    } catch (err) {
      console.error('Error uploading file to S3:', err);
      throw err;
    }
  }

  async removeFile(filePath: string): Promise<void> {
    // Extract the key from the full URL
    // URL formats:
    // - Path-style (MinIO): https://minio.example.com/bucket/2025/12/16/abc123.png
    // - Virtual-hosted (AWS): https://bucket.s3.region.amazonaws.com/2025/12/16/abc123.png
    // - Custom bucket URL: https://cdn.example.com/2025/12/16/abc123.png
    let key = '';

    // Primary: Check if URL starts with configured bucket URL
    if (filePath.startsWith(this._bucketUrl)) {
      key = filePath.substring(this._bucketUrl.length).replace(/^\//, '');
    } else {
      // Fallback: Try to parse URL and extract path after bucket name
      try {
        const url = new URL(filePath);
        const pathParts = url.pathname.split('/').filter(Boolean);

        // Check if first part is the bucket name (path-style URLs)
        if (pathParts[0] === this._bucketName) {
          key = pathParts.slice(1).join('/');
        } else {
          // Virtual-hosted style or custom URL - entire path is the key
          key = pathParts.join('/');
        }
      } catch {
        // Not a valid URL, use as-is (might be just a key)
        key = filePath;
      }
    }

    if (!key) {
      console.warn(`removeFile: Could not extract key from path: ${filePath}`);
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this._bucketName,
        Key: key,
      });
      await this._client.send(command);
    } catch (err) {
      console.error('Error deleting file from S3:', err);
      throw err;
    }
  }
}

export default S3Storage;
