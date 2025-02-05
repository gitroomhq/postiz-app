import { S3Client, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
import axios from 'axios';
import { IUploadProvider } from './upload.interface';

class S3Storage implements IUploadProvider {
  private _client: S3Client;

  constructor(
    accessKey: string,
    secretKey: string,
    private region: string,
    private _bucketName: string,
    private _bucket_dir: string,
    private _uploadUrl: string
  ) {
    this._client = new S3Client({
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async uploadSimple(path: string) {
    const loadImage = await axios.get(path, { responseType: 'arraybuffer' });
    const contentType =
      loadImage?.headers?.['content-type'] ||
      loadImage?.headers?.['Content-Type'];
    const extension = mime.extension(contentType) || '';
    const id = makeId(10);

    const params = {
      Bucket: this._bucketName,
      Key: `${this._bucket_dir}/${id}.${extension}`,
      Body: loadImage.data,
      ContentType: contentType,
    };

    const command = new PutObjectCommand(params);
    await this._client.send(command);

    return `${this._uploadUrl}/${id}.${extension}`;
  }


  async uploadFile(file: Express.Multer.File): Promise<any> {
    const id = makeId(10);
    const extension = mime.extension(file.mimetype) || '';

    const command = new PutObjectCommand({
      Bucket: this._bucketName,
      Key: `${this._bucket_dir}/${id}.${extension}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this._client.send(command);

    return {
      filename: `${id}.${extension}`,
      mimetype: file.mimetype,
      size: file.size,
      originalname: file.originalname,
      path: `${this._uploadUrl}/${id}.${extension}`,
    };
  }

  async removeFile(filePath: string): Promise<void> {
    // Implement file deletion logic here
  }
}

export { S3Storage };
export default S3Storage;
