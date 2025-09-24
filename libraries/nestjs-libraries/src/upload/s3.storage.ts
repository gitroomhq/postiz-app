import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import { getExtension } from 'mime';
import { IUploadProvider } from './upload.interface';

class S3Storage implements IUploadProvider {
  private _client: S3Client;

  constructor(
    private _accessKeyId: string,
    private _secretAccessKey: string,
    private _region: string,
    private _bucketName: string,
    private _endpoint?: string
  ) {
    this._client = new S3Client({
      endpoint: _endpoint, // Optional custom endpoint for S3-compatible services like MinIO
      region: _region,
      credentials: {
        accessKeyId: _accessKeyId,
        secretAccessKey: _secretAccessKey,
      },
    });
  }

  private getUploadUrl(fileName: string): string {
    if (this._endpoint) {
      // For custom S3-compatible endpoints (like MinIO), use endpoint/bucket/file
      return `${this._endpoint}/${this._bucketName}/${fileName}`;
    } else {
      // For standard AWS S3, use bucket.s3.region.amazonaws.com/file
      return `https://${this._bucketName}.s3.${this._region}.amazonaws.com/${fileName}`;
    }
  }

  async uploadSimple(path: string) {
    const loadImage = await fetch(path);
    const contentType =
      loadImage?.headers?.get('content-type') ||
      loadImage?.headers?.get('Content-Type');
    const extension = getExtension(contentType)!;
    const id = makeId(10);

    const params = {
      Bucket: this._bucketName,
      Key: `${id}.${extension}`,
      Body: Buffer.from(await loadImage.arrayBuffer()),
      ContentType: contentType,
      ACL: 'public-read',
    };

    const command = new PutObjectCommand({ ...params });
    await this._client.send(command);

    return this.getUploadUrl(`${id}.${extension}`);
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    const id = makeId(10);
    const extension = mime.extension(file.mimetype) || '';

    const command = new PutObjectCommand({
      Bucket: this._bucketName,
      Key: `${id}.${extension}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this._client.send(command);

    const uploadUrl = this.getUploadUrl(`${id}.${extension}`);
    return {
      filename: `${id}.${extension}`,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      originalname: `${id}.${extension}`,
      fieldname: 'file',
      path: uploadUrl,
      destination: uploadUrl,
      encoding: '7bit',
      stream: file.buffer as any,
    };
  }

  async removeFile(filePath: string): Promise<void> {
    const fileName = filePath.split('/').pop();
    if (fileName) {
      const command = new DeleteObjectCommand({
        Bucket: this._bucketName,
        Key: fileName,
      });
      await this._client.send(command);
    }
  }
}

export { S3Storage };
export default S3Storage;