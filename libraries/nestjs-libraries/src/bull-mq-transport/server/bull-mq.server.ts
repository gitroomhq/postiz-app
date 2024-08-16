import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CustomTransportStrategy,
  Server,
  Transport,
} from '@nestjs/microservices';
import { Job, Worker } from 'bullmq';
import { BULLMQ_MODULE_OPTIONS } from '../constants/bull-mq.constants';
import { WorkerFactory } from '../factories/worker.factory';
import { IBullMqModuleOptions } from '@gitroom/nestjs-libraries/bull-mq-transport/interfaces/bull-mq-module-options.interface';

@Injectable()
export class BullMqServer extends Server implements CustomTransportStrategy {
  transportId = Transport.REDIS;

  protected override readonly logger = new Logger(this.constructor.name);
  protected readonly workers = new Map<string, Worker>();

  constructor(
    @Inject(BULLMQ_MODULE_OPTIONS)
    private readonly options: IBullMqModuleOptions,
    private readonly workerFactory: WorkerFactory
  ) {
    super();

    this.initializeSerializer(this.serializer);
    this.initializeDeserializer(this.deserializer);
  }

  listen(callback: (...optionalParams: unknown[]) => void) {
    for (const [pattern, handler] of this.messageHandlers) {
      if (pattern && handler && !this.workers.has(pattern)) {
        const worker = this.workerFactory.create(
          pattern,
          (job: Job) => {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise<unknown>(async (resolve, reject) => {
              const stream$ = this.transformToObservable(
                await handler(job.data.payload, job)
              );
              this.send(stream$, (packet) => {
                if (packet.err) {
                  return reject(packet.err);
                }
                resolve(packet.response);
              });
            });
          },
          {
            ...this.options,
            ...{ removeOnComplete: { count: 0 }, removeOnFail: { count: 0 } },
            ...handler?.extras,
          }
        );
        this.workers.set(pattern, worker);
        this.logger.log(`Registered queue "${pattern}"`);
      }
    }
    callback();
  }

  async close() {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
  }
}
