import {
  UploadPartCommand,
  S3Client,
  ListPartsCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import path from 'path';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type');

const ALLOWED_EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  '.mp4': 'video/mp4',
};

function normalizeExtension(filename: string): string | null {
  const ext = path.extname(filename || '').toLowerCase();
  return ALLOWED_EXT_TO_MIME[ext] ? ext : null;
}

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }
  return _s3Client;
}

function generateRandomString() {
  return makeId(20);
}

function getPublicUrl(key: string) {
  return `${process.env.S3_BUCKET_URL?.replace(/\/+$/, '')}/${key}`;
}

export default async function handleS3Upload(
  endpoint: string,
  req: Request,
  res: Response
) {
  switch (endpoint) {
    case 'create-multipart-upload':
      return createMultipartUpload(req, res);
    case 'prepare-upload-parts':
      return prepareUploadParts(req, res);
    case 'complete-multipart-upload':
      return completeMultipartUpload(req, res);
    case 'list-parts':
      return listParts(req, res);
    case 'abort-multipart-upload':
      return abortMultipartUpload(req, res);
    case 'sign-part':
      return signPart(req, res);
  }
  return res.status(404).end();
}

export async function simpleUpload(
  data: Buffer,
  originalFilename: string,
  _contentType: string
) {
  const detected = await fromBuffer(data);
  if (!detected || !Object.values(ALLOWED_EXT_TO_MIME).includes(detected.mime)) {
    throw new Error('Unsupported file type.');
  }
  const fileExtension = `.${detected.ext}`;
  const safeContentType = detected.mime;
  const randomFilename = generateRandomString() + fileExtension;

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: randomFilename,
    Body: data,
    ContentType: safeContentType,
  });

  await getS3Client().send(command);

  return getPublicUrl(randomFilename);
}

export async function createMultipartUpload(req: Request, res: Response) {
  const { file, fileHash } = req.body;
  const safeExt = normalizeExtension(file?.name || '');
  if (!safeExt) {
    return res.status(400).json({ message: 'Unsupported file type.' });
  }
  const safeContentType = ALLOWED_EXT_TO_MIME[safeExt];
  const randomFilename = generateRandomString() + safeExt;

  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET,
      Key: randomFilename,
      ContentType: safeContentType,
      Metadata: {
        'x-amz-meta-file-hash': fileHash,
      },
    });
    const response = await getS3Client().send(command);
    return res.status(200).json({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json({ source: { status: 500 } });
  }
}

export async function prepareUploadParts(req: Request, res: Response) {
  const { partData } = req.body;
  const parts = partData.parts;
  const response = { presignedUrls: {} };

  for (const part of parts) {
    try {
      const command = new UploadPartCommand({
        Bucket: process.env.S3_BUCKET,
        Key: partData.key,
        PartNumber: part.number,
        UploadId: partData.uploadId,
      });
      const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
      // @ts-ignore
      response.presignedUrls[part.number] = url;
    } catch (err) {
      console.log('Error', err);
      return res.status(500).json(err);
    }
  }

  return res.status(200).json(response);
}

export async function listParts(req: Request, res: Response) {
  const { key, uploadId } = req.body;

  try {
    const command = new ListPartsCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    });
    const response = await getS3Client().send(command);
    return res.status(200).json(response['Parts']);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function completeMultipartUpload(req: Request, res: Response) {
  const { key, uploadId, parts } = req.body;

  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });
    const response = await getS3Client().send(command);

    const safeExt = normalizeExtension(key || '');
    if (!safeExt) {
      await getS3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      return res.status(400).json({ message: 'Unsupported file type.' });
    }
    const expectedMime = ALLOWED_EXT_TO_MIME[safeExt];

    const head = await getS3Client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Range: 'bytes=0-4100',
      })
    );
    const chunks: Buffer[] = [];
    // @ts-ignore
    for await (const chunk of head.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const prefix = Buffer.concat(chunks);
    const detected = await fromBuffer(prefix);

    if (!detected || detected.mime !== expectedMime) {
      await getS3Client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
      return res
        .status(400)
        .json({ message: 'File contents do not match declared type.' });
    }

    response.Location = getPublicUrl(key);
    return response;
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function abortMultipartUpload(req: Request, res: Response) {
  const { key, uploadId } = req.body;

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      UploadId: uploadId,
    });
    const response = await getS3Client().send(command);
    return res.status(200).json(response);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function signPart(req: Request, res: Response) {
  const { key, uploadId } = req.body;
  const partNumber = parseInt(req.body.partNumber);

  const command = new UploadPartCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    PartNumber: partNumber,
    UploadId: uploadId,
  });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });

  return res.status(200).json({ url });
}
