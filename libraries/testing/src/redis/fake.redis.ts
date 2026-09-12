/**
 * In-memory stand-in for ioredis, so no test can open a socket by accident.
 *
 * Our own redis.service.ts is already safe - it only builds a client when
 * REDIS_URL is set - but something transitive in the integration.service graph
 * constructs one with no arguments, which ioredis defaults to localhost:6379.
 */
export class FakeRedis {
  private store = new Map<string, unknown>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: unknown) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  async quit() {
    return 'OK';
  }

  disconnect() {}

  on() {
    return this;
  }

  once() {
    return this;
  }

  off() {
    return this;
  }
}
