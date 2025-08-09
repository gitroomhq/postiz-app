import { CustomTransportStrategy, Server } from '@nestjs/microservices';
import { Queue, Worker } from 'bullmq';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';

export class BullMqServer extends Server implements CustomTransportStrategy {
  queues: Map<string, Queue>;
  workers: Worker[] = [];

  /**
   * This method is triggered when you run "app.listen()".
   */
  listen(callback: () => void) {
    this.queues = [...this.messageHandlers.keys()].reduce((all, pattern) => {
      all.set(pattern, new Queue(pattern, { connection: ioRedis }));
      return all;
    }, new Map());

    this.workers = Array.from(this.messageHandlers).map(
      ([pattern, handler]) => {
        return new Worker(
          pattern,
          async (job) => {
            const stream$ = this.transformToObservable(
              await handler(job.data.payload, job)
            );

            this.send(stream$, (packet) => {
              if (packet.err) {
                return job.discard();
              }

              return true;
            });
          },
          {
            maxStalledCount: 10,
            concurrency: 300,
            connection: ioRedis,
            removeOnComplete: {
              count: 0,
            },
            removeOnFail: {
              count: 0,
            },
          }
        );
      }
    );

    callback();
  }

  /**
   * This method is triggered on application shutdown.
   */
  close() {
    this.workers.map((worker) => worker.close());
    this.queues.forEach((queue) => queue.close());
    return true;
  }
}
