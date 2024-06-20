import {
  BadRequestException,
  FileTypeValidator,
  Injectable,
  MaxFileSizeValidator,
  ParseFilePipe,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class CustomFileValidationPipe implements PipeTransform {
  async transform(value: any) {
    if (!value) {
      throw 'No file provided.';
    }

    if (!value.mimetype) {
      return value;
    }

    // Set the maximum file size based on the MIME type
    const maxSize = this.getMaxSize(value.mimetype);
    const validation =
      (value.mimetype.startsWith('image/') ||
        value.mimetype.startsWith('video/mp4')) &&
      value.size <= maxSize;

    if (validation) {
      return value;
    }

    throw new BadRequestException(
      `File size exceeds the maximum allowed size of ${maxSize} bytes.`
    );
  }

  private getMaxSize(mimeType: string): number {
    if (mimeType.startsWith('image/')) {
      return 10 * 1024 * 1024; // 10 MB
    } else if (mimeType.startsWith('video/')) {
      return 1024 * 1024 * 1024; // 1 GB
    } else {
      throw new BadRequestException('Unsupported file type.');
    }
  }
}
