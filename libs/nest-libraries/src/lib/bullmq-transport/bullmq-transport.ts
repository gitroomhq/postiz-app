import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Job, Worker } from 'bullmq';
import { ioRedis } from '../redis/redis.service';

export class BullMqTransport extends Server implements CustomTransportStrategy {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private worker: Worker[];

  public listen(callback: () => void) {
    this.worker = [];

    this.messageHandlers.forEach((message, key) => {
      this.worker.push(
        new Worker(
          key,
          async (job: Job) => {
            console.log('processing', job.id);
            await message(JSON.parse(job.data));
          },
          {
            connection: ioRedis,
            runRetryDelay: 3000,
            concurrency: 5,
            autorun: false,
          }
        )
      );
    });
    callback();
  }

  activate() {
    return Promise.all(this.worker.map((p) => {
      console.log('listening to', p.name);
      return p.run();
    }));
  }

  public close() {
    return Promise.all(this.worker.map((p) => p.close()));
  }
}
