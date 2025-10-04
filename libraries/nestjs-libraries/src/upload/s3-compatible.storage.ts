import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';

/**
 * S3-compatible storage provider that works with any S3-compatible service
 * Supports AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi, and more
 */
export class S3CompatibleStorage implements IUploadProvider {
  private _client: S3Client;
  private _bucketName: string;
  private _publicUrl: string;
  private _pathStyle: boolean;
  private _useSignedUrls: boolean;
  private _signedUrlExpiry: number;

  /**
   * Initialize S3-compatible storage provider
   * @param accessKeyId - S3 access key ID
   * @param secretAccessKey - S3 secret access key
   * @param region - S3 region (e.g., 'us-east-1', 'auto' for Cloudflare)
   * @param bucketName - S3 bucket name
   * @param endpoint - Custom S3 endpoint (optional, for S3-compatible services)
   * @param publicUrl - Public URL where files will be accessible
   * @param pathStyle - Use path-style URLs (true for MinIO, false for AWS S3)
   * @param useSignedUrls - Generate signed URLs for private buckets
   * @param signedUrlExpiry - Signed URL expiry time in seconds (default: 3600)
   */
  constructor(
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    bucketName: string,
    endpoint?: string,
    publicUrl?: string,
    pathStyle: boolean = false,
    useSignedUrls: boolean = false,
    signedUrlExpiry: number = 3600
  ) {
    this._bucketName = bucketName;
    this._pathStyle = pathStyle;
    this._useSignedUrls = useSignedUrls;
    this._signedUrlExpiry = signedUrlExpiry;

    // Configure public URL for file access
    if (publicUrl) {
      this._publicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
    } else if (endpoint) {
      // Auto-generate public URL based on endpoint and path style
      this._publicUrl = pathStyle
        ? `${endpoint}/${bucketName}`
        : `${endpoint.replace('://', `://${bucketName}.`)}`;
    } else {
      // Default AWS S3 URL format
      this._publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com`;
    }

    // Initialize S3 client with appropriate configuration
    this._client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: pathStyle, // Required for MinIO and some S3-compatible services
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });

    // Add middleware for Cloudflare R2 compatibility (removes checksum headers)
    if (endpoint?.includes('cloudflarestorage.com')) {
      this._client.middlewareStack.add(
        (next) =>
          async (args): Promise<any> => {
            const request = args.request as RequestInit;
            const headers = request.headers as Record<string, string>;

            // Remove checksum headers that cause issues with Cloudflare R2
            delete headers['x-amz-checksum-crc32'];
            delete headers['x-amz-checksum-crc32c'];
            delete headers['x-amz-checksum-sha1'];
            delete headers['x-amz-checksum-sha256'];

            request.headers = headers;
            return next(args);
          },
        { step: 'build', name: 'customHeaders' }
      );
    }
  }

  /**
   * Generate public URL for a file
   * @param fileName - The file name/key in the bucket
   * @returns Promise<string> - The public URL or signed URL
   */
  private async getFileUrl(fileName: string): Promise<string> {
    if (this._useSignedUrls) {
      // Generate signed URL for private buckets
      const command = new GetObjectCommand({
        Bucket: this._bucketName,
        Key: fileName,
      });

      return await getSignedUrl(this._client, command, {
        expiresIn: this._signedUrlExpiry,
      });
    } else {
      // Return public URL
      return `${this._publicUrl}/${fileName}`;
    }
  }

  /**
   * Upload a file from a URL
   * @param path - URL of the file to upload
   * @returns Promise<string> - The URL where the uploaded file can be accessed
   */
  async uploadSimple(path: string): Promise<string> {
    try {
      // Fetch the file from the provided URL
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from ${path}: ${response.statusText}`);
      }

      const contentType =
        response.headers.get('content-type') ||
        response.headers.get('Content-Type') ||
        'application/octet-stream';

      const extension = getExtension(contentType);
      if (!extension) {
        throw new Error(`Unable to determine file extension for content type: ${contentType}`);
      }

      const id = makeId(10);
      const fileName = `${id}.${extension}`;

      // Upload to S3-compatible storage
      const command = new PutObjectCommand({
        Bucket: this._bucketName,
        Key: fileName,
        Body: Buffer.from(await response.arrayBuffer()),
        ContentType: contentType,
        ACL: this._useSignedUrls ? undefined : 'public-read', // Only set ACL for public access
      });

      await this._client.send(command);

      return await this.getFileUrl(fileName);
    } catch (error) {
      console.error('Error uploading file via uploadSimple:', error);
      throw new Error(`Failed to upload file from ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a file from form data
   * @param file - The uploaded file object
   * @returns Promise<any> - File information including the access URL
   */
  async uploadFile(file: Express.Multer.File): Promise<any> {
    try {
      const id = makeId(10);
      const extension = mime.extension(file.mimetype) || 'bin';
      const fileName = `${id}.${extension}`;

      // Upload to S3-compatible storage
      const command = new PutObjectCommand({
        Bucket: this._bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: this._useSignedUrls ? undefined : 'public-read', // Only set ACL for public access
      });

      await this._client.send(command);

      const fileUrl = await this.getFileUrl(fileName);

      return {
        filename: fileName,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
        originalname: fileName,
        fieldname: 'file',
        path: fileUrl,
        destination: fileUrl,
        encoding: '7bit',
        stream: file.buffer as any,
      };
    } catch (error) {
      console.error('Error uploading file via uploadFile:', error);
      throw new Error(`Failed to upload file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a file from storage
   * @param filePath - The file path/URL to remove
   * @returns Promise<void>
   */
  async removeFile(filePath: string): Promise<void> {
    try {
      // Extract filename from the full URL
      const fileName = filePath.split('/').pop();
      if (!fileName) {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      const command = new DeleteObjectCommand({
        Bucket: this._bucketName,
        Key: fileName,
      });

      await this._client.send(command);
    } catch (error) {
      console.error('Error removing file:', error);
      throw new Error(`Failed to remove file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}