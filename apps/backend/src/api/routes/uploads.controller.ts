import { Controller, Get, Headers, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { readFromR2 } from '@gitroom/nestjs-libraries/upload/r2.reader';

/**
 * Serves media from our own domain rather than from the storage bucket.
 *
 * Deliberately unauthenticated, and registered outside `authenticatedController`
 * for that reason: these URLs are handed to Instagram, TikTok and the rest,
 * whose servers fetch them with no session. What it does not do is let anyone
 * roam the bucket — storage only ever emits keys shaped like "aB3xY9pQr7.png",
 * and anything else is refused before a request is made.
 *
 * Only used with `STORAGE_PROVIDER=cloudflare`. Local storage already serves its
 * own files through the frontend.
 */
@ApiTags('Media')
@Controller('/uploads')
export class UploadsController {
  // Keys as produced by CloudflareStorage: makeId(10) plus an extension. No
  // slashes, no traversal, no query — nothing that could address another object.
  private static readonly KEY = /^[A-Za-z0-9._-]{1,128}$/;

  @Get('/:key')
  async serve(
    @Param('key') key: string,
    @Res() res: Response,
    @Headers('if-none-match') ifNoneMatch?: string
  ) {
    if (
      process.env.STORAGE_PROVIDER !== 'cloudflare' ||
      !UploadsController.KEY.test(key)
    ) {
      res.status(404).end();
      return;
    }

    const object = await readFromR2(key);
    if (!object) {
      res.status(404).end();
      return;
    }

    // Stored objects are immutable — every upload gets a fresh random name and
    // nothing ever overwrites one — so this can be cached hard. It is what
    // keeps a social network re-fetching the same image from costing us a read
    // every time.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.etag) {
      res.setHeader('ETag', object.etag);

      if (ifNoneMatch === object.etag) {
        res.status(304).end();
        return;
      }
    }

    res.setHeader(
      'Content-Type',
      object.contentType || 'application/octet-stream'
    );
    if (object.contentLength) {
      res.setHeader('Content-Length', String(object.contentLength));
    }

    object.body.on('error', () => res.destroy());
    object.body.pipe(res);
  }
}
