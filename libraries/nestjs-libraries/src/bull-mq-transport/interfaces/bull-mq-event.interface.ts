import { JobsOptions } from 'bullmq';

export interface IBullMqEvent<T> {
  id?: string;
  payload: T;
  options?: JobsOptions;
}
