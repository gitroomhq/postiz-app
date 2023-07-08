import { ClientsModule, Transport } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

export const kafkaOptions = {
  options: {
    client: {
      clientId: 'votes',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      brokers: process?.env?.KAFKA_BROKERS?.split(',') || [],
    },
    consumer: {
      groupId: 'votes-counter',
    },
  },
};
export const KafkaModule = ClientsModule.register([
  {
    transport: Transport.KAFKA,
    name: 'VOTES_SERVICE',
    ...kafkaOptions,
  },
]);

export const VoteServiceProducer = () => Inject('VOTES_SERVICE');
