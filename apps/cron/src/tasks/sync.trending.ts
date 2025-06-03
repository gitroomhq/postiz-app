import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';

@Injectable()
export class SyncTrending {
  constructor(private _workerServiceProducer: BullMqClient) {}
  @Cron('0 * * * *')
  async syncTrending() {
    this._workerServiceProducer.emit('sync_trending', {}).subscribe();
  }
}
