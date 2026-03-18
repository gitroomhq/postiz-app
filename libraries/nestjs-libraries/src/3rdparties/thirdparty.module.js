import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { HeygenProvider } from "./heygen/heygen.provider";
import { ThirdPartyManager } from "./thirdparty.manager";
let ThirdPartyModule = class ThirdPartyModule {
};
ThirdPartyModule = __decorate([
    Global(),
    Module({
        providers: [HeygenProvider, ThirdPartyManager],
        get exports() {
            return this.providers;
        },
    })
], ThirdPartyModule);
export { ThirdPartyModule };
//# sourceMappingURL=thirdparty.module.js.map