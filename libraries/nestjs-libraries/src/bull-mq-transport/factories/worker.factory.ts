import { Injectable } from '@nestjs/common';
import { Processor, Worker, WorkerOptions } from 'bullmq';

@Injectable()
export class WorkerFactory {
  create<T, R, N extends string>(
    name: string,
    processor?: string | Processor<T, R, N>,
    opts?: WorkerOptions,
  ): Worker<T, R, N> {
    return new Worker(name, processor, opts);
  }
}
