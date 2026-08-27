import { Redis } from 'ioredis';
import { logger, errorType, errorMessage } from '@gitroom/nestjs-libraries/sentry/logger';

// Create a mock Redis implementation for testing environments
class MockRedis {
  private data: Map<string, any> = new Map();

  async get(key: string) {
    return this.data.get(key);
  }

  async set(key: string, value: any) {
    this.data.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    this.data.delete(key);
    return 1;
  }

  // Add other Redis methods as needed for your tests
}

const createRedis = () => {
  if (!process.env.REDIS_URL) {
    logger.error('redis_fallback_to_memory', {
      reason: 'REDIS_URL is not set',
    });

    return new MockRedis() as unknown as Redis;
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
  });

  client.on('error', (err) => {
    logger.error('redis_connection_error', {
      error_type: errorType(err),
      error_message: errorMessage(err),
    });
  });

  return client;
};

// Use real Redis if REDIS_URL is defined, otherwise use MockRedis
export const ioRedis = createRedis();
