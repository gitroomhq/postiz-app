import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import concat from 'concat-stream';
import { StorageEngine } from 'multer';
import type { Request } from 'express';
import {makeId} from "@gitroom/nestjs-libraries/services/make.is";
import mime from 'mime-types';

export interface CloudflareCDNUploadResponse<T = string[]> {
  success: boolean;
  errors: {
    code: number;
    message: string;
  }[];
  result: {
    id: string;
    filename: string;
    metadata: {
      meta: string;
    };
    requireSignedURLs: boolean;
    variants: T;
    uploaded: string;
  };
}

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
    private _bucketName: string,
    private _uploadUrl: string
  ) {
    this._client = new S3Client({
      endpoint: `https://${accountID}.r2.cloudflarestorage.com`,
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

    const upload = await this._client.send(command);

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

    // const request = await fetch(this.destURL, {
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer ${this.accountToken}`,
    //     ...body.getHeaders(),
    //   },
    //   body,
    // });
    //
    // const response: CloudflareCDNUploadResponse = await request.json();
    // if (request.ok) {
    //   return callback(null, {
    //     path: response.result.variants[0],
    //     filename: response.result.filename,
    //     destination: response.result.id,
    //   });
    // }
    //
    // console.log(response);

    // return callback(
    //   new Error(
    //     'There was an error in uploading an asset to Cloudflare Images.'
    //   )
    // );
  }

  private async _deleteFile(
    filedestination: string,
    callback: CallbackFunction
  ) {
    // const request = await fetch(`${this.destURL}/${filedestination}`, {
    //   method: 'DELETE',
    //   headers: {
    //     Authorization: `Bearer ${this.accountToken}`,
    //   },
    // });
    //
    // if (request.ok) return callback(null);
    // return callback(
    //   new Error(
    //     'There was an error in deleting the asset from Cloudflare Images.'
    //   )
    // );
  }
}

export { CloudflareStorage };
export default CloudflareStorage;
