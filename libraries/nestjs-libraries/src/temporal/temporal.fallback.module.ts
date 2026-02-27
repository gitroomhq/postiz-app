import { Global, Module } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

function emptyAsyncIterable<T>(): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          return { done: true, value: undefined as T };
        },
      };
    },
  };
}

const temporalServiceFallback = {
  terminateWorkflow: async (): Promise<boolean> => false,
  client: {
    getRawClient: (): {
      workflow: {
        start: () => Promise<undefined>;
        signalWithStart: () => Promise<undefined>;
        list: () => AsyncIterable<unknown>;
      };
    } => ({
      workflow: {
        start: async (): Promise<undefined> => undefined,
        signalWithStart: async (): Promise<undefined> => undefined,
        list: (): AsyncIterable<unknown> => emptyAsyncIterable(),
      },
    }),
    getWorkflowHandle: async (): Promise<{
      describe: () => Promise<{ status: { name: string } }>;
      terminate: () => Promise<undefined>;
      signal: () => Promise<undefined>;
    }> => ({
      describe: async (): Promise<{ status: { name: string } }> => ({
        status: { name: 'TERMINATED' },
      }),
      terminate: async (): Promise<undefined> => undefined,
      signal: async (): Promise<undefined> => undefined,
    }),
  },
};

@Global()
@Module({
  providers: [
    {
      provide: TemporalService,
      useValue: temporalServiceFallback as unknown as TemporalService,
    },
  ],
  exports: [TemporalService],
})
export class TemporalFallbackModule {}
