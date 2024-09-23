import { Command, Positional } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';

@Injectable()
export class CheckStars {
  constructor(private _workerServiceProducer: BullMqClient) {}
  @Command({
    command: 'sync:stars <login>',
    describe: 'Sync stars for a login',
  })
  async create(
    @Positional({
      name: 'login',
      describe: 'login {owner}/{repo}',
      type: 'string',
    })
    login: string
  ) {
    this._workerServiceProducer
      .emit('check_stars', { payload: { login } })
      .subscribe();
    return true;
  }

  @Command({
    command: 'sync:all_stars <login>',
    describe: 'Sync all stars for a login',
  })
  async syncAllStars(
    @Positional({
      name: 'login',
      describe: 'login {owner}/{repo}',
      type: 'string',
    })
    login: string
  ) {
    this._workerServiceProducer
      .emit('sync_all_stars', { payload: { login } })
      .subscribe();
    return true;
  }

  @Command({
    command: 'sync:trending',
    describe: 'Sync trending',
  })
  async syncTrending() {
    this._workerServiceProducer.emit('sync_trending', {}).subscribe();
    return true;
  }
}
