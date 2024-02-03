import { IBullMqModuleOptions } from './bull-mq-module-options.interface';

export interface IBullMqModuleOptionsFactory {
  createModuleOptions(): IBullMqModuleOptions | Promise<IBullMqModuleOptions>;
}
