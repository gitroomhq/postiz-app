import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import Bottleneck from 'bottleneck';
import { timer } from '@gitroom/helpers/utils/timer';

const connection = new Bottleneck.IORedisConnection({
  client: ioRedis,
});

const mapper = {} as Record<string, Bottleneck>;

export const concurrency = async <T>(
  identifier: string,
  maxConcurrent = 1,
  func: (...args: any[]) => Promise<T>
) => {
  const strippedIdentifier = identifier.toLowerCase().split('-')[0];
  mapper[strippedIdentifier] ??= new Bottleneck({
    id: strippedIdentifier + '-concurrency',
    maxConcurrent,
    datastore: 'ioredis',
    connection,
  });
  let load: T;
  try {
    load = await mapper[strippedIdentifier].schedule<T>(
      { expiration: 120_000 },
      async () => {
        const res = await func();
        await timer(2000);
        return res;
      }
    );
  } catch (err) {}

  return load;
};
