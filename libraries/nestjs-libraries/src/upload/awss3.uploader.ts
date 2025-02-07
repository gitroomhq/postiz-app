import {
  UploadPartCommand, S3Client, ListPartsCommand, CreateMultipartUploadCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, PutObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';


const getStorageProvider = () => {
  return process.env.STORAGE_PROVIDER
}

const getBucketName = () => {
  return process.env.AWS_BUCKET_NAME;
}

const getBucketURL = () => {
  return process.env.AWS_BUCKET_URL;
}

const getRegion = () => {
  return process.env.AWS_REGION;
}

const getEndpoint = () => {
  return undefined;
}

const getAccessKey = () => {
  return process.env.AWS_ACCESS_KEY_ID;
}

const getSecretAccessKey = () => {
  return process.env.AWS_SECRET_ACCESS_KEY;
}


const R2_CLIENT = () => {

  let R3_config = {
    region: getRegion(),
    // endpoint: getEndpoint(),
    credentials: {
      accessKeyId: getAccessKey()!,
      secretAccessKey: getSecretAccessKey()!,
    },
    signingEscapePath: false, // Ensures correct URL encoding
  }
  return new S3Client({ ...R3_config });
}

// Function to generate a random string
function generateRandomString() {
  return makeId(20);
}

export default async function handleR2Upload(
  endpoint: string,
  req: Request,
  res: Response
) {

  console.log(" ==> handleR2Upload()");
  console.log(" ==> endpoint: ", endpoint);

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

export async function simpleUpload(data: Buffer, originalFilename: string, contentType: string) {
  const fileExtension = path.extname(originalFilename); // Extract extension
  const randomFilename = generateRandomString() + fileExtension; // Append extension

  const params = {
    Bucket: getBucketName(),
    // Key: randomFilename,
    Key: `${process.env.AWS_BUCKET_DIR || ''}/${randomFilename}`,
    Body: data,
    ContentType: contentType,
  };

  const command = new PutObjectCommand({ ...params });

  await R2_CLIENT().send(command); ``

  return getBucketURL() + '/' + randomFilename;
}

export async function createMultipartUpload(
  req: Request,
  res: Response
) {
  const { file, fileHash, contentType } = req.body;
  const fileExtension = path.extname(file.name); // Extract extension
  const randomFilename = generateRandomString() + fileExtension; // Append extension

  console.log(" ==> createMultipartUpload::: ");


  const config = {
    region: getRegion(),
    endpoint: getEndpoint(),
    credentials: {
      accessKeyId: getAccessKey()!,
      secretAccessKey: getSecretAccessKey()!,
    },
  }

  console.log(" ==> config::: ", config);


  try {
    const params = {
      Bucket: getBucketName(),
      // Key: `${randomFilename}`,
      Key: `${process.env.AWS_BUCKET_DIR || ''}/${randomFilename}`,
      ContentType: contentType,
      // Metadata: {
      //   'x-amz-meta-file-hash': fileHash,
      // },
    };

    console.log(" ===> params:: ", params);


    const command = new CreateMultipartUploadCommand({ ...params });
    const response = await R2_CLIENT().send(command);

    console.log(" ===> response:: ", response);

    return res.status(200).json({
      uploadId: response.UploadId,
      key: response.Key,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ source: { status: 500 } });
  }
}

export async function prepareUploadParts(
  req: Request,
  res: Response
) {
  const { partData } = req.body;

  const parts = partData.parts;

  const response = {
    presignedUrls: {},
  };

  for (const part of parts) {
    try {
      const params = {
        Bucket: getBucketName(),
        Key: partData.key,
        PartNumber: part.number,
        UploadId: partData.uploadId,
      };
      const command = new UploadPartCommand({ ...params });
      const url = await getSignedUrl(R2_CLIENT(), command, { expiresIn: 3600 });

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
    const params = {
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
    };
    const command = new ListPartsCommand({ ...params });
    const response = await R2_CLIENT().send(command);

    return res.status(200).json(response['Parts']);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function completeMultipartUpload(
  req: Request,
  res: Response
) {
  const { key, uploadId, parts } = req.body;

  try {
    const params = {
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    };

    const command = new CompleteMultipartUploadCommand({
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });
    const response = await R2_CLIENT().send(command);
    response.Location = getBucketURL() + '/' + response?.Location?.split('/').at(-1);
    return response;
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function abortMultipartUpload(
  req: Request,
  res: Response
) {
  const { key, uploadId } = req.body;

  try {
    const params = {
      Bucket: getBucketName(),
      Key: key,
      UploadId: uploadId,
    };
    const command = new AbortMultipartUploadCommand({ ...params });
    const response = await R2_CLIENT().send(command);

    return res.status(200).json(response);
  } catch (err) {
    console.log('Error', err);
    return res.status(500).json(err);
  }
}

export async function signPart(req: Request, res: Response) {
  const { key, uploadId } = req.body;
  const partNumber = parseInt(req.body.partNumber);

  console.log(" ==> signPart::: ", key, uploadId, partNumber);

  const params = {
    Bucket: getBucketName(),
    Key: key,
    PartNumber: partNumber,
    UploadId: uploadId,
    // Expires: 3600
  };

  console.log(" ==> params::: ", params);

  const command = new UploadPartCommand({ ...params });
  const url = await getSignedUrl(R2_CLIENT(), command, { expiresIn: 3600 });

  console.log(" ==> url::: ", url);

  return res.status(200).json({
    url: url,
  });
}
