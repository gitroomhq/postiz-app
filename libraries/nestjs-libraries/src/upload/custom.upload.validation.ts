import {
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import {
  VALID_POST_MEDIA_EXTENSIONS,
  VALID_POST_MEDIA_MIME_TYPES,
} from '@gitroom/helpers/utils/has.extension';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fromBuffer } = require('file-type');

const ALLOWED_EXTENSIONS_MESSAGE = `Valid extensions: ${VALID_POST_MEDIA_EXTENSIONS
  .map((ext) => '.' + ext)
  .join(', ')}`;

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

    if (!value.buffer || !Buffer.isBuffer(value.buffer)) {
      throw new BadRequestException('Invalid file upload.');
    }

    const detected = await fromBuffer(value.buffer);
    if (!detected || !VALID_POST_MEDIA_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException(
        `Unsupported file type. ${ALLOWED_EXTENSIONS_MESSAGE}`
      );
    }

    const maxSize = this.getMaxSize(detected.mime);
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

  private getMaxSize(mimeType: string): number {
    if (mimeType.startsWith('image/')) {
      return 10 * 1024 * 1024; // 10 MB
    } else if (mimeType.startsWith('video/')) {
      return 1024 * 1024 * 1024; // 1 GB
    } else {
      throw new BadRequestException(
        `Unsupported file type. ${ALLOWED_EXTENSIONS_MESSAGE}`
      );
    }
  }
}
