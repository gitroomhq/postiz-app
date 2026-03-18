import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';
import { AutopostService } from "../../../../libraries/nestjs-libraries/src/database/prisma/autopost/autopost.service";
let AutopostActivity = class AutopostActivity {
    constructor(_autoPostService) {
        this._autoPostService = _autoPostService;
    }
    autoPost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._autoPostService.startAutopost(id);
        });
    }
};
__decorate([
    ActivityMethod(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AutopostActivity.prototype, "autoPost", null);
AutopostActivity = __decorate([
    Injectable(),
    Activity(),
    __metadata("design:paramtypes", [AutopostService])
], AutopostActivity);
export { AutopostActivity };
//# sourceMappingURL=autopost.activity.js.map