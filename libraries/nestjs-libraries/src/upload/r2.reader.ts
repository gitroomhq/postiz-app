import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { r2Endpoint } from '@gitroom/nestjs-libraries/upload/r2.endpoint';

/**
 * Reads objects back out of R2 so the application can serve media from its own
 * domain instead of handing out bucket URLs.
 *
 * Why that matters: several networks — Instagram, Facebook, Pinterest, TikTok
 * photo posts — do not accept the file from us, they fetch the address we give
 * them. A bucket's r2.dev address is rate limited and documented as unfit for
 * production, and it cannot be verified with the networks that require you to
 * prove you own the domain you are serving from. Serving through our own host
 * fixes both, and lets the bucket stay private.
 *
 * This reads over the S3 API, not r2.dev, so no rate limit applies here.
 */

let client: S3Client | undefined;

function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.CLOUDFLARE_REGION || 'auto',
      endpoint: r2Endpoint(
        process.env.CLOUDFLARE_ACCOUNT_ID!,
        process.env.CLOUDFLARE_JURISDICTION
      ),
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });
  }

  return client;
}

export interface R2Object {
  body: Readable;
  contentType?: string;
  contentLength?: number;
  etag?: string;
}

/**
 * Returns null when the object is not there, rather than throwing — a missing
 * file is a 404, not a server error, and media URLs are public enough to be
 * probed.
 */
export async function readFromR2(key: string): Promise<R2Object | null> {
  try {
    const object = await r2().send(
      new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_BUCKETNAME!,
        Key: key,
      })
    );

    return {
      body: object.Body as Readable,
      contentType: object.ContentType,
      contentLength: object.ContentLength,
      etag: object.ETag,
    };
  } catch {
    return null;
  }
}
