import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AuthProviderAbstract } from "../providers.interface";
let AuthProviderManager = class AuthProviderManager {
    constructor(_moduleRef) {
        this._moduleRef = _moduleRef;
    }
    getProvider(provider) {
        const metadata = Reflect.getMetadata('auth-provider', AuthProviderAbstract) || [];
        const found = metadata.find((m) => m.provider === provider);
        if (!found) {
            throw new Error(`Auth provider ${provider} not found`);
        }
        return this._moduleRef.get(found.target, { strict: false });
    }
};
AuthProviderManager = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ModuleRef])
], AuthProviderManager);
export { AuthProviderManager };
//# sourceMappingURL=providers.manager.js.map