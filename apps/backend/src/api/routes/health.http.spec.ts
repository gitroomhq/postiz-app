import * as http from 'node:http';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthService } from '@gitroom/nestjs-libraries/health/health.service';
import { HealthController } from './health.controller';

// node http with agent: false, a pooled client socket would keep jest running
const get = (url: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const request = http.get(
      url,
      { agent: false, headers: { connection: 'close' } },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () =>
          resolve({ status: response.statusCode!, body })
        );
      }
    );

    request.on('error', reject);
  });

describe('GET /health', () => {
  let app: INestApplication;

  const listenWith = async (health: unknown) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: { check: async () => health } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0, '127.0.0.1');

    const address = app.getHttpServer().address() as { port: number };
    return `http://127.0.0.1:${address.port}`;
  };

  afterEach(async () => {
    await app?.close();
  });

  it('answers 200 with the checks when every dependency is up', async () => {
    const health = { status: 'ok', checks: { database: 'up', redis: 'up' } };
    const url = await listenWith(health);

    const { status, body } = await get(`${url}/health`);

    expect(status).toBe(200);
    expect(JSON.parse(body)).toEqual(health);
  });

  it('answers 503 with the failing check when a dependency is down', async () => {
    const health = {
      status: 'error',
      checks: { database: 'down', redis: 'up' },
    };
    const url = await listenWith(health);

    const { status, body } = await get(`${url}/health`);

    expect(status).toBe(503);
    expect(JSON.parse(body)).toEqual(health);
  });
});
