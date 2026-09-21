import { Global, Module } from '@nestjs/common';
import { UploadFactory } from './upload.factory';

@Global()
@Module({
  providers: [UploadFactory],
  exports: [UploadFactory],
})
export class UploadModule {}
