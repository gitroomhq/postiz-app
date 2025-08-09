import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { Queue, QueueEvents } from 'bullmq';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { v4 } from 'uuid';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BullMqClient extends ClientProxy {
  queues = new Map<string, Queue>();
  queueEvents = new Map<string, QueueEvents>();

  async connect(): Promise<any> {
    return;
  }

  async close() {
    return;
  }

  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void
  ) {
    // console.log('hello');
    // this.publishAsync(packet, callback);
    return () => console.log('sent');
  }

  delete(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.remove(jobId);
  }

  deleteScheduler(pattern: string, jobId: string) {
    const queue = this.getQueue(pattern);
    return queue.removeJobScheduler(jobId);
  }

  async publishAsync(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void
  ) {
    const queue = this.getQueue(packet.pattern);
    const queueEvents = this.getQueueEvents(packet.pattern);
    const job = await queue.add(packet.pattern, packet.data, {
      jobId: packet.data.id ?? v4(),
      ...packet.data.options,
      removeOnComplete: !packet.data.options.attempts,
      removeOnFail: !packet.data.options.attempts,
    });

    try {
      await job.waitUntilFinished(queueEvents);
      console.log('success');
      callback({ response: job.returnvalue, isDisposed: true });
    } catch (err) {
      console.log('err');
      callback({ err, isDisposed: true });
    }
  }

  getQueueEvents(pattern: string) {
    return (
      this.queueEvents.get(pattern) ||
      new QueueEvents(pattern, {
        connection: ioRedis,
      })
    );
  }

  getQueue(pattern: string) {
    return (
      this.queues.get(pattern) ||
      new Queue(pattern, {
        connection: ioRedis,
      })
    );
  }

  async checkForStuckWaitingJobs(queueName: string) {
    const queue = this.getQueue(queueName);
    const getJobs = await queue.getJobs('waiting' as const);
    const now = Date.now();
    const thresholdMs = 60 * 60 * 1000;
    return {
      valid: !getJobs.some((job) => {
        const age = now - job.timestamp;
        return age > thresholdMs;
      }),
    };
  }

  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    console.log('event to dispatch: ', packet);
    const queue = this.getQueue(packet.pattern);
    if (packet?.data?.options?.every) {
      const { every, immediately } = packet.data.options;
      const id = packet.data.id ?? v4();
      await queue.upsertJobScheduler(
        id,
        { every, ...(immediately ? { immediately } : {}) },
        {
          name: id,
          data: packet.data,
          opts: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        }
      );
      return;
    }

    await queue.add(packet.pattern, packet.data, {
      jobId: packet.data.id ?? v4(),
      ...packet.data.options,
      removeOnComplete: true,
      removeOnFail: true,
    });
  }
}
