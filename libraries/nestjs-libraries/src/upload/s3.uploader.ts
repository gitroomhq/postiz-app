import {
  UploadPartCommand,
  S3Client,
  ListPartsCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import path from 'path';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { constructS3BucketUrl } from './s3.utils';

export interface S3UploaderConfig {
  endpoint?: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucketName: string;
  bucketUrl?: string; // Optional: Public URL override (auto-generated if not provided)
}

export class S3Uploader {
  private client: S3Client;
  private bucketName: string;
  private bucketUrl: string;

  constructor(config: S3UploaderConfig) {
    this.bucketName = config.bucketName;
    this.bucketUrl = constructS3BucketUrl({
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

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.client = new S3Client(clientConfig);
  }

  private generateRandomString(): string {
    return makeId(20);
  }

  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  async handleUpload(endpoint: string, req: Request, res: Response) {
    switch (endpoint) {
      case 'create-multipart-upload':
        return this.createMultipartUpload(req, res);
      case 'prepare-upload-parts':
        return this.prepareUploadParts(req, res);
      case 'complete-multipart-upload':
        return this.completeMultipartUpload(req, res);
      case 'list-parts':
        return this.listParts(req, res);
      case 'abort-multipart-upload':
        return this.abortMultipartUpload(req, res);
      case 'sign-part':
        return this.signPart(req, res);
    }
    return res.status(404).end();
  }

  async simpleUpload(
    data: Buffer,
    originalFilename: string,
    contentType: string
  ): Promise<string> {
    const fileExtension = path.extname(originalFilename);
    const randomFilename = this.generateRandomString() + fileExtension;
    const datePath = this.getDatePath();
    const key = `${datePath}/${randomFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: data,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.client.send(command);
    return this.bucketUrl + '/' + key;
  }

  private async createMultipartUpload(req: Request, res: Response) {
    const { file, fileHash, contentType } = req.body;
    if (!file?.name) {
      return res.status(400).json({ error: 'Missing file name' });
    }
    const fileExtension = path.extname(file.name);
    const randomFilename = this.generateRandomString() + fileExtension;
    const datePath = this.getDatePath();
    const key = `${datePath}/${randomFilename}`;

    try {
      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        Metadata: {
          'x-amz-meta-file-hash': fileHash,
        },
      });

      const response = await this.client.send(command);
      return res.status(200).json({
        uploadId: response.UploadId,
        key: response.Key,
      });
    } catch (err) {
      console.log('Error', err);
      return res.status(500).json({ source: { status: 500 } });
    }
  }

  private async prepareUploadParts(req: Request, res: Response) {
    const { partData } = req.body;
    const parts = partData.parts;

    const response: { presignedUrls: Record<number, string> } = {
      presignedUrls: {},
    };

    for (const part of parts) {
      try {
        const command = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: partData.key,
          PartNumber: part.number,
          UploadId: partData.uploadId,
        });
        const url = await getSignedUrl(this.client, command, {
          expiresIn: 3600,
        });

        response.presignedUrls[part.number] = url;
      } catch (err) {
        console.log('Error', err);
        return res.status(500).json(err);
      }
    }

    return res.status(200).json(response);
  }

  private async listParts(req: Request, res: Response) {
    const { key, uploadId } = req.body;

    try {
      const command = new ListPartsCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });
      const response = await this.client.send(command);
      return res.status(200).json(response.Parts || []);
    } catch (err) {
      console.log('Error', err);
      return res.status(500).json(err);
    }
  }

  async completeMultipartUpload(req: Request, res: Response) {
    const { key, uploadId, parts } = req.body;

    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      });
      const response = await this.client.send(command);
      // Use the key from request (reliable) instead of parsing Location (fragile)
      // The key is the filename we generated during createMultipartUpload
      response.Location = `${this.bucketUrl}/${key}`;
      return response;
    } catch (err) {
      console.log('Error', err);
      return res.status(500).json(err);
    }
  }

  private async abortMultipartUpload(req: Request, res: Response) {
    const { key, uploadId } = req.body;

    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      });
      const response = await this.client.send(command);
      return res.status(200).json(response);
    } catch (err) {
      console.log('Error', err);
      return res.status(500).json(err);
    }
  }

  private async signPart(req: Request, res: Response) {
    const { key, uploadId } = req.body;
    const partNumber = parseInt(req.body.partNumber, 10);

    if (isNaN(partNumber)) {
      return res.status(400).json({ error: 'Invalid part number' });
    }

    try {
      const command = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: key,
        PartNumber: partNumber,
        UploadId: uploadId,
      });
      const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });

      return res.status(200).json({ url });
    } catch (err) {
      console.log('Error signing part', err);
      return res.status(500).json(err);
    }
  }
}

// Factory function for creating S3 uploader from environment variables
export function createS3Uploader(): S3Uploader {
  const required = ['S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_REGION', 'S3_BUCKET'];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for S3 uploader: ${missing.join(', ')}`
    );
  }

  return new S3Uploader({
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKey: process.env.S3_ACCESS_KEY!,
    secretKey: process.env.S3_SECRET_KEY!,
    region: process.env.S3_REGION!,
    bucketName: process.env.S3_BUCKET!,
    bucketUrl: process.env.S3_BUCKET_URL || undefined,
  });
}

export default S3Uploader;
