import { __decorate, __metadata } from "tslib";
import { IsArray, IsBoolean, IsDefined, IsOptional, IsString, IsUrl, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
export class Integrations {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], Integrations.prototype, "id", void 0);
export class AutopostDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], AutopostDto.prototype, "title", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], AutopostDto.prototype, "content", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], AutopostDto.prototype, "lastUrl", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], AutopostDto.prototype, "onSlot", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], AutopostDto.prototype, "syncLast", void 0);
__decorate([
    IsUrl(),
    IsDefined(),
    __metadata("design:type", String)
], AutopostDto.prototype, "url", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], AutopostDto.prototype, "active", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], AutopostDto.prototype, "addPicture", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], AutopostDto.prototype, "generateContent", void 0);
__decorate([
    IsArray(),
    Type(() => Integrations),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], AutopostDto.prototype, "integrations", void 0);
//# sourceMappingURL=autopost.dto.js.map