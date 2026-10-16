jest.mock('@gitroom/nestjs-libraries/redis/redis.service', () => ({
  ioRedis: { ping: jest.fn() },
}));

import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { HealthService } from './health.service';

const ping = ioRedis.ping as jest.Mock;

const serviceWith = (findFirst: jest.Mock) =>
  new HealthService({ user: { findFirst } } as any);

describe('HealthService', () => {
  it('is ok when the database and redis both answer', async () => {
    ping.mockResolvedValue('PONG');
    const service = serviceWith(jest.fn().mockResolvedValue({ id: 'user-1' }));

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('is an error when the database query fails', async () => {
    ping.mockResolvedValue('PONG');
    const service = serviceWith(
      jest.fn().mockRejectedValue(new Error('connection refused'))
    );

    await expect(service.check()).resolves.toEqual({
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    });
  });

  it('is an error when redis cannot be reached', async () => {
    ping.mockRejectedValue(new Error('connection refused'));
    const service = serviceWith(jest.fn().mockResolvedValue({ id: 'user-1' }));

    await expect(service.check()).resolves.toEqual({
      status: 'error',
      checks: { database: 'up', redis: 'down' },
    });
  });

  it('reports a dependency that never answers as down instead of hanging', async () => {
    jest.useFakeTimers();
    try {
      ping.mockResolvedValue('PONG');
      const service = serviceWith(jest.fn().mockReturnValue(new Promise(() => {})));

      const result = service.check();
      await jest.advanceTimersByTimeAsync(6000);

      await expect(result).resolves.toEqual({
        status: 'error',
        checks: { database: 'down', redis: 'up' },
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
