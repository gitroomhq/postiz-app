import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import concat from 'concat-stream';
import { StorageEngine } from 'multer';
import type { Request } from 'express';
import {makeId} from "@gitroom/nestjs-libraries/services/make.is";
import mime from 'mime-types';

type CallbackFunction = (
  error: Error | null,
  info?: Partial<Express.Multer.File>
) => void;

class CloudflareStorage implements StorageEngine {
  private _client: S3Client;

  public constructor(
    accountID: string,
    accessKey: string,
    secretKey: string,
    private region: string,
    private _bucketName: string,
    private _uploadUrl: string,
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

  public _handleFile(
    _req: Request,
    file: Express.Multer.File,
    callback: CallbackFunction
  ): void {
    file.stream.pipe(
      concat({ encoding: 'buffer' }, async (data) => {
        // @ts-ignore
        callback(null, await this._uploadFile(data, data.length, file.mimetype, mime.extension(file.mimetype)));
      })
    );
  }

  public _removeFile(
    _req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null) => void
  ): void {
    void this._deleteFile(file.destination, callback);
  }

  private async _uploadFile(data: Buffer, size: number, mime: string, extension: string): Promise<Express.Multer.File> {
    const id = makeId(10);
    const command = new PutObjectCommand({
      Bucket: this._bucketName,
      ACL: 'public-read',
      Key: `${id}.${extension}`,
      Body: data,
    });

    await this._client.send(command);

    return {
      filename: `${id}.${extension}`,
      mimetype: mime,
      size,
      buffer: data,
      originalname: `${id}.${extension}`,
      fieldname: 'file',
      path: `${this._uploadUrl}/${id}.${extension}`,
      destination: `${this._uploadUrl}/${id}.${extension}`,
      encoding: '7bit',
      stream: data as any,
    }
  }

  private async _deleteFile(
    filedestination: string,
    callback: CallbackFunction
  ) {
  }
}

export { CloudflareStorage };
export default CloudflareStorage;
