import { __awaiter } from "tslib";
import { Injectable } from '@nestjs/common';
export class AuthProviderAbstract {
    postRegistration(providerToken, orgId) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
export function AuthProvider(params) {
    return function (target) {
        Injectable()(target);
        const existingMetadata = Reflect.getMetadata('auth-provider', AuthProviderAbstract) || [];
        existingMetadata.push({ target, provider: params.provider });
        Reflect.defineMetadata('auth-provider', existingMetadata, AuthProviderAbstract);
    };
}
//# sourceMappingURL=providers.interface.js.map