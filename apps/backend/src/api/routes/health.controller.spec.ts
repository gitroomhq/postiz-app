import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

const controllerWith = (health: unknown) =>
  new HealthController({ check: jest.fn().mockResolvedValue(health) } as any);

describe('HealthController', () => {
  it('answers the checks when every dependency is up', async () => {
    const health = {
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    };

    await expect(controllerWith(health).check()).resolves.toEqual(health);
  });

  it('answers 503 with the failing check when a dependency is down', async () => {
    const health = {
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    };

    const error = await controllerWith(health)
      .check()
      .catch((err) => err);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toEqual(health);
  });
});
