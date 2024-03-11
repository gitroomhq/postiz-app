import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import { Redis } from 'ioredis';

export const ioRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const client = createClient({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  url: process.env.REDIS_URL,
});

client.on('error', (error) => {
    console.error(error);
});

const pubSub = client.duplicate();

@Injectable()
export class RedisService implements OnModuleInit {
  async onModuleInit() {
    await client.connect();
  }

  client() {
    return client;
  }

  pubSub() {
    return pubSub;
  }
}
