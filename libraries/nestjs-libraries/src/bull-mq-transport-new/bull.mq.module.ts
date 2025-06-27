import { Global, Module } from '@nestjs/common';
import { BullMqClient } from '@chaolaolo/nestjs-libraries/bull-mq-transport-new/client';

@Global()
@Module({
  providers: [BullMqClient],
  exports: [BullMqClient],
})
export class BullMqModule { }
