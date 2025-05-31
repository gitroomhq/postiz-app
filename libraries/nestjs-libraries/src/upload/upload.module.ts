import { Global, Module } from '@nestjs/common';
import { UploadFactory } from './upload.factory';
import { CustomFileValidationPipe } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';

@Global()
@Module({
  providers: [UploadFactory, CustomFileValidationPipe],
  exports: [UploadFactory, CustomFileValidationPipe],
})
export class UploadModule {}
