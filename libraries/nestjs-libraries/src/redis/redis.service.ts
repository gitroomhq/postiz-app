import { Redis } from 'ioredis';

export const ioRedis = new Redis(process.env.REDIS_URL + '?family=0', {
  maxRetriesPerRequest: null,
  connectTimeout: 10000
});