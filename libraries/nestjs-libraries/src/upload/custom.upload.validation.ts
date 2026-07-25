import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import {
  detectUploadType,
  discardTempFile,
  MAX_UPLOAD_BYTES,
} from '@gitroom/nestjs-libraries/upload/uploaded.file';

const ALLOWED_MIME_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
]);

@Injectable()
export class CustomFileValidationPipe implements PipeTransform {
  async transform(value: any) {
    if (!value || typeof value !== 'object') {
      return value;
    }

    // Skip non-file parameters (org, body, query, etc.)
    if (!('buffer' in value) && !('mimetype' in value) && !('fieldname' in value)) {
      return value;
    }

    // Rejecting here means the route handler never runs, so the `finally` that
    // deletes a spooled file never runs either. Multer only cleans up after
    // limits it enforces itself, and a file refused for its type or size is not
    // one of those — so without this, every rejected upload stays on disk.
    try {
      // Held in memory, or spooled to disk when the file came to us rather than
      // straight to storage. Either is valid; neither being present is not.
      if (value.buffer ? !Buffer.isBuffer(value.buffer) : !value.path) {
        throw new BadRequestException('Invalid file upload.');
      }

      const detected = await detectUploadType(value);
      if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
        throw new BadRequestException('Unsupported file type.');
      }

      const maxSize = getMaxSize(detected.mime);
      if (value.size > maxSize) {
        throw new BadRequestException(
          `File size exceeds the maximum allowed size of ${maxSize} bytes.`
        );
      }

      value.mimetype = detected.mime;
      const safeBase = (value.originalname || 'upload')
        .replace(/\.[^./\\]*$/, '')
        .replace(/[\\/]/g, '_')
        .slice(0, 100) || 'upload';
      value.originalname = `${safeBase}.${detected.ext}`;

      return value;
    } catch (err) {
      await discardTempFile(value);
      throw err;
    }
  }

}

export function getMaxSize(mimeType: string): number {
  // One ceiling for everything, and it is the same one multer enforces while
  // reading. Images used to be held to a separate, much smaller figure that
  // disagreed with what the uploader allowed, so a file in between was accepted
  // by the browser, uploaded in full, and refused at the end. A single limit
  // cannot drift like that.
  //
  // Note this is the limit on what may be *stored*. Social networks impose
  // their own, far smaller limits on what they will publish.
  if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
    return MAX_UPLOAD_BYTES;
  }

  throw new BadRequestException('Unsupported file type.');
}
