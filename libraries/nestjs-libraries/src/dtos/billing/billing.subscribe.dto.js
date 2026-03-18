import { __decorate, __metadata } from "tslib";
import { IsIn } from 'class-validator';
export class BillingSubscribeDto {
}
__decorate([
    IsIn(['MONTHLY', 'YEARLY']),
    __metadata("design:type", String)
], BillingSubscribeDto.prototype, "period", void 0);
__decorate([
    IsIn(['STANDARD', 'PRO', 'TEAM', 'ULTIMATE']),
    __metadata("design:type", String)
], BillingSubscribeDto.prototype, "billing", void 0);
//# sourceMappingURL=billing.subscribe.dto.js.map