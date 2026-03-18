import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
let MonitorController = class MonitorController {
    getMessagesGroup(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                status: 'success',
                message: `Queue ${name} is healthy.`,
            };
        });
    }
};
__decorate([
    Get('/queue/:name'),
    __param(0, Param('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MonitorController.prototype, "getMessagesGroup", null);
MonitorController = __decorate([
    ApiTags('Monitor'),
    Controller('/monitor')
], MonitorController);
export { MonitorController };
//# sourceMappingURL=monitor.controller.js.map