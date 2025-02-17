import { Redis } from 'ioredis';

export const ioRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000
});