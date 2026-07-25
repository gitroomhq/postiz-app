import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { detectUploadType } from '@gitroom/nestjs-libraries/upload/uploaded.file';

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
  }

}

export function getMaxSize(mimeType: string): number {
  if (mimeType.startsWith('image/')) {
    // Matches the limit the uploader enforces in the browser. They used to
    // disagree — 30 MB there, 10 MB here — which normally went unnoticed
    // because compression shrinks an image well under either figure before it
    // is sent. The gap showed itself where compression does not apply: GIFs are
    // skipped by design, and DISABLE_IMAGE_COMPRESSION turns it off entirely.
    // In those cases the browser accepted a file, uploaded all of it, and only
    // then heard it was too large.
    return 30 * 1024 * 1024; // 30 MB
  } else if (mimeType.startsWith('video/')) {
    return 1024 * 1024 * 1024; // 1 GB
  } else {
    throw new BadRequestException('Unsupported file type.');
  }
}
