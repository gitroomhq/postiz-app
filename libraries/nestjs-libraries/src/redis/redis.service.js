import { __awaiter } from "tslib";
import { Redis } from 'ioredis';
// Create a mock Redis implementation for testing environments
class MockRedis {
    constructor() {
        this.data = new Map();
        // Add other Redis methods as needed for your tests
    }
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.data.get(key);
        });
    }
    set(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            this.data.set(key, value);
            return 'OK';
        });
    }
    del(key) {
        return __awaiter(this, void 0, void 0, function* () {
            this.data.delete(key);
            return 1;
        });
    }
}
// Use real Redis if REDIS_URL is defined, otherwise use MockRedis
export const ioRedis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        connectTimeout: 10000,
    })
    : new MockRedis(); // Type cast to Redis to maintain interface compatibility
//# sourceMappingURL=redis.service.js.map