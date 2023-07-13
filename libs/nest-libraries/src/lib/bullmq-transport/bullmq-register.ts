import { Inject, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { BullMqClient } from './bullmq-client';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'BULL_MQ_QUEUE',
        customClass: BullMqClient,
      },
    ]),
  ],
  get exports() {
    return this.imports;
  }
})
export class BullmqRegister {}

export const VoteServiceProducer = () => Inject('BULL_MQ_QUEUE');
