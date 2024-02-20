import { Inject, Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ReadPacket,
  RpcException,
  WritePacket,
} from '@nestjs/microservices';
import { Queue } from 'bullmq';
import { v4 } from 'uuid';
import { BULLMQ_MODULE_OPTIONS } from '../constants/bull-mq.constants';
import { QueueEventsFactory } from '../factories/queue-events.factory';
import { QueueFactory } from '../factories/queue.factory';
import { IBullMqEvent } from '../interfaces/bull-mq-event.interface';
import {IBullMqModuleOptions} from "@gitroom/nestjs-libraries/bull-mq-transport/interfaces/bull-mq-module-options.interface";

@Injectable()
export class BullMqClient extends ClientProxy {
  constructor(
    @Inject(BULLMQ_MODULE_OPTIONS)
    private readonly options: IBullMqModuleOptions,
    private readonly queueFactory: QueueFactory,
    private readonly queueEventsFactory: QueueEventsFactory,
  ) {
    super();
  }

  async connect(): Promise<void> {
    return;
  }

  async close(): Promise<void> {
    return;
  }

  protected publish(
    packet: ReadPacket<IBullMqEvent<any>>,
    callback: (packet: WritePacket<any>) => void,
  ): () => void {
    const queue = this.getQueue(packet.pattern);
    const events = this.queueEventsFactory.create(packet.pattern, {
      connection: this.options.connection,
    });
    events.on('completed', (job) =>
      callback({
        response: job.returnvalue,
        isDisposed: true,
      }),
    );
    events.on('failed', async (jobInfo) => {
      const job = await queue.getJob(jobInfo.jobId);
      const err = new RpcException(jobInfo.failedReason);
      err.stack = job?.stacktrace?.[0];
      callback({
        err,
        isDisposed: true,
      });
    });
    queue
      .add(packet.pattern, packet.data, {
        jobId: packet.data.id ?? v4(),
        ...packet.data.options,
      })
      .then(async (job) => {
        try {
          await job.waitUntilFinished(events);
        } catch {
          // BullMq unnecessarily re-throws the error we're handling in
          // waitUntilFinished(), so we ignore that here.
        } finally {
          await events.close();
          await queue.close();
        }
      });
    return () => void 0;
  }

  delay(pattern: string, jobId: string, delay: number) {
    const queue = this.getQueue(pattern);
    return queue.getJob(jobId).then((job) => job?.changeDelay(delay));
  }

  async delete(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.getJob(jobId).then((job) => job?.remove());
  }

  job(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.getJob(jobId);
  }

  protected async dispatchEvent(
    packet: ReadPacket<IBullMqEvent<any>>,
  ): Promise<any> {
    const queue = this.getQueue(packet.pattern);
    console.log(packet);
    await queue.add(packet.pattern, packet.data, {
      jobId: packet.data.id ?? v4(),
      ...packet.data.options,
    });
    await queue.close();
  }

  protected getQueue(pattern: any): Queue {
    const queue = this.queueFactory.create(pattern, {
      connection: this.options.connection,
    });
    return queue;
  }
}
