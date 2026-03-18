import { __decorate, __metadata } from "tslib";
import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class LinkedinDto {
}
__decorate([
    IsBoolean(),
    IsOptional(),
    __metadata("design:type", Boolean)
], LinkedinDto.prototype, "post_as_images_carousel", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], LinkedinDto.prototype, "carousel_name", void 0);
//# sourceMappingURL=linkedin.dto.js.map