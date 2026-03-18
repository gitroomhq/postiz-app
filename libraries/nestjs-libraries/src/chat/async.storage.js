// context.ts
import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage();
export function runWithContext(ctx, fn) {
    return als.run(ctx, fn);
}
export function getContext() {
    return als.getStore();
}
export function getAuth() {
    var _a;
    return (_a = als.getStore()) === null || _a === void 0 ? void 0 : _a.auth;
}
export function getRequestId() {
    var _a;
    return (_a = als.getStore()) === null || _a === void 0 ? void 0 : _a.requestId;
}
//# sourceMappingURL=async.storage.js.map