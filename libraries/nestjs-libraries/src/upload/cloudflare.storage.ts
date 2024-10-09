import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import 'multer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import mime from 'mime-types';
// @ts-ignore
import {getExtension} from 'mime';
import { IUploadProvider } from './upload.interface';
import axios from 'axios';

class CloudflareStorage implements IUploadProvider {
  private _client: S3Client;

  constructor(
    accountID: string,
    accessKey: string,
    secretKey: string,
    private region: string,
    private _bucketName: string,
    private _uploadUrl: string
  ) {
    this._client = new S3Client({
      endpoint: `https://${accountID}.r2.cloudflarestorage.com`,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    });
  }

  async uploadSimple(path: string) {
    const loadImage = await axios.get(path, { responseType: 'arraybuffer' });
    const contentType = loadImage?.headers?.['content-type'] || loadImage?.headers?.['Content-Type'];
    const extension = getExtension(contentType)!;
    const id = makeId(10);

    const params = {
      Bucket: this._bucketName,
      Key: `${id}.${extension}`,
      Body: loadImage.data,
      ContentType: contentType,
    };

    const command = new PutObjectCommand({ ...params });
    await this._client.send(command);

    return `${this._uploadUrl}/${id}.${extension}`;
  }

  async uploadFile(file: Express.Multer.File): Promise<any> {
    const id = makeId(10);
    const extension = mime.extension(file.mimetype) || '';

    // Create the PutObjectCommand to upload the file to Cloudflare R2
    const command = new PutObjectCommand({
      Bucket: this._bucketName,
      ACL: 'public-read',
      Key: `${id}.${extension}`,
      Body: file.buffer,
    });

    await this._client.send(command);

    return {
      filename: `${id}.${extension}`,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      originalname: `${id}.${extension}`,
      fieldname: 'file',
      path: `${this._uploadUrl}/${id}.${extension}`,
      destination: `${this._uploadUrl}/${id}.${extension}`,
      encoding: '7bit',
      stream: file.buffer as any,
    };
  }

  // Implement the removeFile method from IUploadProvider
  async removeFile(filePath: string): Promise<void> {
    // const fileName = filePath.split('/').pop(); // Extract the filename from the path
    // const command = new DeleteObjectCommand({
    //   Bucket: this._bucketName,
    //   Key: fileName,
    // });
    // await this._client.send(command);
  }
}

export { CloudflareStorage };
export default CloudflareStorage;
