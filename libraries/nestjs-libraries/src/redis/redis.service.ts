import { Redis } from 'ioredis';

console.log(`Connecting to Redis at ${process.env.REDIS_URL}!`);

export const ioRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
});
