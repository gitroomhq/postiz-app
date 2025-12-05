import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import Bottleneck from 'bottleneck';
import { timer } from '@gitroom/helpers/utils/timer';
import { BadBody } from '@gitroom/nestjs-libraries/integrations/social.abstract';

// Try to create Redis connection for Bottleneck, but fall back to local if it fails
let connection: Bottleneck.IORedisConnection | null = null;
try {
  connection = new Bottleneck.IORedisConnection({
    client: ioRedis,
  });
} catch (err) {
  console.log('[Bottleneck] Could not create Redis connection, using local datastore:', err instanceof Error ? err.message : String(err));
}

const mapper = {} as Record<string, Bottleneck>;

export const concurrency = async <T>(
  identifier: string,
  maxConcurrent = 1,
  func: (...args: any[]) => Promise<T>,
  ignoreConcurrency = false
) => {
  const strippedIdentifier = identifier.toLowerCase().split('-')[0];
  mapper[strippedIdentifier] ??= new Bottleneck({
    id: strippedIdentifier + '-concurrency-new',
    maxConcurrent,
    ...(connection ? { datastore: 'ioredis', connection } : {}),
    minTime: 1000,
  });
  let load: T;

  if (ignoreConcurrency) {
    return await func();
  }

  try {
    load = await mapper[strippedIdentifier].schedule<T>(
      { expiration: 60000 },
      async () => {
        try {
          return await func();
        } catch (err) {}
      }
    );
  } catch (err) {
    console.log(err);
    throw new BadBody(
      identifier,
      JSON.stringify({}),
      {} as any,
      `Something is wrong with ${identifier}`
    );
  }

  return load;
};
