import { __decorate, __metadata } from "tslib";
import { IsOptional, IsString, IsIn, IsUrl, ValidateIf } from 'class-validator';
export class GmbSettingsDto {
}
__decorate([
    IsOptional(),
    IsIn(['STANDARD', 'EVENT', 'OFFER']),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "topicType", void 0);
__decorate([
    IsOptional(),
    IsIn([
        'NONE',
        'BOOK',
        'ORDER',
        'SHOP',
        'LEARN_MORE',
        'SIGN_UP',
        'GET_OFFER',
        'CALL',
    ]),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "callToActionType", void 0);
__decorate([
    IsOptional(),
    ValidateIf((o) => o.callToActionType),
    IsUrl(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "callToActionUrl", void 0);
__decorate([
    IsOptional(),
    ValidateIf((o) => o.topicType === 'EVENT'),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "eventTitle", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "eventStartDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "eventEndDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "eventStartTime", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "eventEndTime", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "offerCouponCode", void 0);
__decorate([
    IsOptional(),
    ValidateIf((o) => o.offerRedeemUrl),
    IsUrl(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "offerRedeemUrl", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GmbSettingsDto.prototype, "offerTerms", void 0);
//# sourceMappingURL=gmb.settings.dto.js.map