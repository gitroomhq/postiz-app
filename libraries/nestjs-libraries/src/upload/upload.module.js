import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { UploadFactory } from './upload.factory';
import { CustomFileValidationPipe } from "./custom.upload.validation";
let UploadModule = class UploadModule {
};
UploadModule = __decorate([
    Global(),
    Module({
        providers: [UploadFactory, CustomFileValidationPipe],
        exports: [UploadFactory, CustomFileValidationPipe],
    })
], UploadModule);
export { UploadModule };
//# sourceMappingURL=upload.module.js.map