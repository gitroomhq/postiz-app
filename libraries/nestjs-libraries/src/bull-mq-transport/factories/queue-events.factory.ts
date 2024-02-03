import { Injectable } from '@nestjs/common';
import { QueueEvents, QueueEventsOptions } from 'bullmq';

@Injectable()
export class QueueEventsFactory {
  create(name: string, options?: QueueEventsOptions): QueueEvents {
    return new QueueEvents(name, options);
  }
}
