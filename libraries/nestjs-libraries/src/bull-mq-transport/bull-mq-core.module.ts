import { DynamicModule, Module } from '@nestjs/common';
import { BullMqClient } from './client/bull-mq.client';
import { BULLMQ_MODULE_OPTIONS } from './constants/bull-mq.constants';
import { QueueEventsFactory } from './factories/queue-events.factory';
import { QueueFactory } from './factories/queue.factory';
import { WorkerFactory } from './factories/worker.factory';
import { IBullMqModuleOptionsAsync } from './interfaces/bull-mq-module-options-async.interface';
import { IBullMqModuleOptionsFactory } from './interfaces/bull-mq-module-options-factory.interface';
import { IBullMqModuleOptions } from './interfaces/bull-mq-module-options.interface';
import { BullMqServer } from './server/bull-mq.server';

@Module({})
export class BullMqCoreModule {
  static forRoot(options: IBullMqModuleOptions): DynamicModule {
    return {
      module: BullMqCoreModule,
      global: true,
      providers: [
        { provide: BULLMQ_MODULE_OPTIONS, useValue: options },
        QueueFactory,
        QueueEventsFactory,
        WorkerFactory,
        BullMqServer,
        BullMqClient,
      ],
      exports: [BullMqServer, BullMqClient, BULLMQ_MODULE_OPTIONS],
    };
  }

  static forRootAsync(options: IBullMqModuleOptionsAsync): DynamicModule {
    return {
      module: BullMqCoreModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        ...(options.providers ?? []),
        ...this.createAsyncProviders(options),
        QueueFactory,
        QueueEventsFactory,
        WorkerFactory,
        BullMqServer,
        BullMqClient,
      ],
      exports: [BullMqServer, BullMqClient, BULLMQ_MODULE_OPTIONS],
    };
  }

  private static createAsyncProviders(options: IBullMqModuleOptionsAsync) {
    if (options.useExisting ?? options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        { provide: options.useClass, useClass: options.useClass },
      ];
    }

    throw new Error(
      'Invalid BullMqModule async options: one of `useClass`, `useExisting` or `useFactory` should be defined.',
    );
  }

  private static createAsyncOptionsProvider(
    options: IBullMqModuleOptionsAsync,
  ) {
    if (options.useFactory) {
      return {
        provide: BULLMQ_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject ?? [],
      };
    }

    const inject: any[] = [];

    if (options.useClass ?? options.useExisting) {
      inject.push(options.useClass ?? options.useExisting);
    }

    return {
      provide: BULLMQ_MODULE_OPTIONS,
      useFactory: async (optionsFactory: IBullMqModuleOptionsFactory) =>
        await optionsFactory.createModuleOptions(),
      inject,
    };
  }
}
