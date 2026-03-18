import { __awaiter, __decorate } from "tslib";
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';
let ThrottlerBehindProxyGuard = class ThrottlerBehindProxyGuard extends ThrottlerGuard {
    canActivate(context) {
        const _super = Object.create(null, {
            canActivate: { get: () => super.canActivate }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const { url, method } = context.switchToHttp().getRequest();
            if (method === 'POST' && url.includes('/public/v1/posts')) {
                return _super.canActivate.call(this, context);
            }
            return true;
        });
    }
    getTracker(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return (req.org.id + '_' + (req.url.indexOf('/posts') > -1 ? 'posts' : 'other'));
        });
    }
};
ThrottlerBehindProxyGuard = __decorate([
    Injectable()
], ThrottlerBehindProxyGuard);
export { ThrottlerBehindProxyGuard };
//# sourceMappingURL=throttler.provider.js.map