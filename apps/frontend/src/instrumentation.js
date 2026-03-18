import { __awaiter } from "tslib";
export function register() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
            return;
        }
        if (process.env.NEXT_RUNTIME === 'nodejs') {
            yield import('./sentry.server.config');
        }
        if (process.env.NEXT_RUNTIME === 'edge') {
            yield import('./sentry.edge.config');
        }
    });
}
//# sourceMappingURL=instrumentation.js.map