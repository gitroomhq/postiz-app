import { Type } from '@nestjs/common';
import { IBullMqModuleOptionsFactory } from './bull-mq-module-options-factory.interface';
import { IBullMqModuleOptions } from './bull-mq-module-options.interface';

export interface IBullMqModuleOptionsAsync {
  imports?: any[];
  providers?: any[];
  inject?: any[];
  useClass?: Type<IBullMqModuleOptionsFactory>;
  useExisting?: Type<IBullMqModuleOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => IBullMqModuleOptions | Promise<IBullMqModuleOptions>;
}
