import { __decorate, __metadata } from "tslib";
import { Controller, Get } from '@nestjs/common';
let RootController = class RootController {
    getRoot() {
        return 'App is running!';
    }
};
__decorate([
    Get('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], RootController.prototype, "getRoot", null);
RootController = __decorate([
    Controller('/')
], RootController);
export { RootController };
//# sourceMappingURL=root.controller.js.map