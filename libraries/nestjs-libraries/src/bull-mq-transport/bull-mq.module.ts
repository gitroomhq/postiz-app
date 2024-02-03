import { DynamicModule, Module } from '@nestjs/common';
import { BullMqCoreModule } from './bull-mq-core.module';
import { IBullMqModuleOptionsAsync } from './interfaces/bull-mq-module-options-async.interface';
import { IBullMqModuleOptions } from './interfaces/bull-mq-module-options.interface';

@Module({})
export class BullMqModule {
  static forRoot(options: IBullMqModuleOptions): DynamicModule {
    return {
      module: BullMqModule,
      imports: [BullMqCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(options: IBullMqModuleOptionsAsync): DynamicModule {
    return {
      module: BullMqModule,
      imports: [BullMqCoreModule.forRootAsync(options)],
    };
  }
}
