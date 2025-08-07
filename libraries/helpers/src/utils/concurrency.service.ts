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
    id: strippedIdentifier + '-concurrency-new',
    maxConcurrent,
    datastore: 'ioredis',
    connection,
    minTime: 1000,
  });
  let load: T;
  try {
    load = await mapper[strippedIdentifier].schedule<T>(
      { expiration: 600000 },
      async () => {
        return await Promise.race<T>([
          new Promise<T>(async (res) => {
            await timer(300000);
            res(true as T);
          }),
          new Promise<T>(async (res) => {
            try {
              return res(await func());
            } catch (err) {
              res(err as T);
            }
          }),
        ]);
      }
    );
  } catch (err) {}

  return load;
};
