import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';

@ApiTags('Monitor')
@Controller('/monitor')
export class MonitorController {
  constructor(private _workerServiceProducer: BullMqClient) {}

  @Get('/queue/:name')
  getMessagesGroup(@Param('name') name: string) {
    return this._workerServiceProducer.checkForStuckWaitingJobs(name);
  }
}
