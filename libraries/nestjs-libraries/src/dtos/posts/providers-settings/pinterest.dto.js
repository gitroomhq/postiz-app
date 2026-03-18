import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, IsUrl, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class PinterestSettingsDto {
}
__decorate([
    IsString(),
    ValidateIf((o) => !!o.title),
    MaxLength(100),
    __metadata("design:type", String)
], PinterestSettingsDto.prototype, "title", void 0);
__decorate([
    IsString(),
    ValidateIf((o) => !!o.link),
    IsUrl(),
    __metadata("design:type", String)
], PinterestSettingsDto.prototype, "link", void 0);
__decorate([
    IsString(),
    ValidateIf((o) => !!o.dominant_color),
    __metadata("design:type", String)
], PinterestSettingsDto.prototype, "dominant_color", void 0);
__decorate([
    IsDefined({
        message: 'Board is required',
    }),
    IsString({
        message: 'Board is required',
    }),
    MinLength(1, {
        message: 'Board is required',
    }),
    JSONSchema({
        description: 'board must be an id',
    }),
    __metadata("design:type", String)
], PinterestSettingsDto.prototype, "board", void 0);
//# sourceMappingURL=pinterest.dto.js.map