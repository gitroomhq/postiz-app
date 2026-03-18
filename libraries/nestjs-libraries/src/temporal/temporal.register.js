import { __awaiter, __decorate, __metadata } from "tslib";
import { Global, Injectable, Module } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
let TemporalRegister = class TemporalRegister {
    constructor(_client) {
        this._client = _client;
    }
    onModuleInit() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (process.env.TEMPORAL_TLS === 'true') {
                return;
            }
            const connection = (_c = (_b = (_a = this._client) === null || _a === void 0 ? void 0 : _a.client) === null || _b === void 0 ? void 0 : _b.getRawClient()) === null || _c === void 0 ? void 0 : _c.connection;
            const { customAttributes } = yield connection.operatorService.listSearchAttributes({
                namespace: process.env.TEMPORAL_NAMESPACE || 'default',
            });
            const neededAttribute = ['organizationId', 'postId'];
            const missingAttributes = neededAttribute.filter((attr) => !customAttributes[attr]);
            if (missingAttributes.length > 0) {
                yield connection.operatorService.addSearchAttributes({
                    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
                    searchAttributes: missingAttributes.reduce((all, current) => {
                        // @ts-ignore
                        all[current] = 1;
                        return all;
                    }, {}),
                });
            }
        });
    }
};
TemporalRegister = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [TemporalService])
], TemporalRegister);
export { TemporalRegister };
let TemporalRegisterMissingSearchAttributesModule = class TemporalRegisterMissingSearchAttributesModule {
};
TemporalRegisterMissingSearchAttributesModule = __decorate([
    Global(),
    Module({
        imports: [],
        controllers: [],
        providers: [TemporalRegister],
        get exports() {
            return this.providers;
        },
    })
], TemporalRegisterMissingSearchAttributesModule);
export { TemporalRegisterMissingSearchAttributesModule };
//# sourceMappingURL=temporal.register.js.map