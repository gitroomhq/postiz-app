import { LogLevel } from '@nestjs/common';
import { WorkerOptions } from 'bullmq';

export interface IBullMqModuleOptions extends WorkerOptions {
  logExceptionsAsLevel?: LogLevel | 'off';
}
