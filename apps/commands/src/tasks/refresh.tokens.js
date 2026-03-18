import { __awaiter, __decorate, __metadata } from "tslib";
import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { IntegrationService } from "../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
let RefreshTokens = class RefreshTokens {
    constructor(_integrationService) {
        this._integrationService = _integrationService;
    }
    refresh() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._integrationService.refreshTokens();
            return true;
        });
    }
};
__decorate([
    Command({
        command: 'refresh',
        describe: 'Refresh all tokens',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RefreshTokens.prototype, "refresh", null);
RefreshTokens = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [IntegrationService])
], RefreshTokens);
export { RefreshTokens };
//# sourceMappingURL=refresh.tokens.js.map