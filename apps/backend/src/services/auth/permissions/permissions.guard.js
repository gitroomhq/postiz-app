import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService, } from "./permissions.service";
import { CHECK_POLICIES_KEY, } from "./permissions.ability";
import { SubscriptionException } from './permission.exception.class';
let PoliciesGuard = class PoliciesGuard {
    constructor(_reflector, _authorizationService) {
        this._reflector = _reflector;
        this._authorizationService = _authorizationService;
    }
    canActivate(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = context.switchToHttp().getRequest();
            if (request.path.indexOf('/auth') > -1 ||
                request.path.indexOf('/auth') > -1 ||
                request.path.indexOf('/integrations/social-connect') > -1 ||
                request.path.indexOf('/integrations/provider') > -1) {
                return true;
            }
            const policyHandlers = this._reflector.get(CHECK_POLICIES_KEY, context.getHandler()) || [];
            if (!policyHandlers || !policyHandlers.length) {
                return true;
            }
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            const { org } = request;
            // @ts-ignore
            const ability = yield this._authorizationService.check(org.id, org.createdAt, org.users[0].role, policyHandlers);
            const item = policyHandlers.find((handler) => !this.execPolicyHandler(handler, ability));
            if (item) {
                throw new SubscriptionException({
                    section: item[1],
                    action: item[0],
                });
            }
            return true;
        });
    }
    execPolicyHandler(handler, ability) {
        return ability.can(handler[0], handler[1]);
    }
};
PoliciesGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector,
        PermissionsService])
], PoliciesGuard);
export { PoliciesGuard };
//# sourceMappingURL=permissions.guard.js.map