import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString, IsUrl, MinLength, } from 'class-validator';
export class DribbbleDto {
}
__decorate([
    IsString(),
    IsDefined(),
    MinLength(1, {
        message: 'Title is required',
    }),
    __metadata("design:type", String)
], DribbbleDto.prototype, "title", void 0);
__decorate([
    IsString(),
    IsOptional(),
    IsUrl(),
    __metadata("design:type", String)
], DribbbleDto.prototype, "team", void 0);
//# sourceMappingURL=dribbble.dto.js.map