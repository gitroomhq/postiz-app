import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { timer } from '@gitroom/helpers/utils/timer';

export async function concurrencyService<T>(
  identifier: string,
  func: (...args: any[]) => Promise<T>
): Promise<T> {
  const key = `throttle:${identifier.split('-')[0]}`;
  const expirationSeconds = 180;

  while (true) {
    const setLock = await ioRedis.set(
      key,
      'locked',
      'EX',
      expirationSeconds,
      'NX'
    );

    if (setLock) {
      break;
    }

    // Wait before trying again
    await timer(1000);
  }

  let load: T;
  try {
    load = await func();
  } catch (err) {}
  await timer(2000);
  await ioRedis.del(key);

  return load;
}
