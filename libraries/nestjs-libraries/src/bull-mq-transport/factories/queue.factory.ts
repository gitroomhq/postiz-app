import { Injectable } from '@nestjs/common';
import { Queue, QueueOptions } from 'bullmq';

@Injectable()
export class QueueFactory {
  create(name: string, options?: QueueOptions): Queue {
    return new Queue(name, options);
  }
}
