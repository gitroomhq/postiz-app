import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import Bottleneck from 'bottleneck';

const connection = new Bottleneck.IORedisConnection({
  client: ioRedis,
});

const bottleneck = new Bottleneck.Group({
  maxConcurrent: 1,
  datastore: 'ioredis',
  connection,
});

export async function concurrencyService<T>(
  identifier: string,
  func: (...args: any[]) => Promise<T>
): Promise<T> {
  let load: T;
  try {
    load = await bottleneck
      .key(identifier.split('-')[0])
      .schedule<T>({ expiration: 120_000 }, async () => {
        return await func();
      });
  } catch (err) {}

  return load;
}
