import { __decorate, __metadata } from "tslib";
import { IsOptional, ValidateIf, IsUrl } from 'class-validator';
export class FacebookDto {
}
__decorate([
    IsOptional(),
    ValidateIf(p => p.url),
    IsUrl(),
    __metadata("design:type", String)
], FacebookDto.prototype, "url", void 0);
//# sourceMappingURL=facebook.dto.js.map