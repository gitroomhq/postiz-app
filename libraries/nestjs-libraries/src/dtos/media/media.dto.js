import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, IsUrl, ValidateIf, Validate } from 'class-validator';
import { ValidUrlExtension, ValidUrlPath } from "../../../../helpers/src/utils/valid.url.path";
export class MediaDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], MediaDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    Validate(ValidUrlPath),
    Validate(ValidUrlExtension),
    __metadata("design:type", String)
], MediaDto.prototype, "path", void 0);
__decorate([
    ValidateIf((o) => o.alt),
    IsString(),
    __metadata("design:type", String)
], MediaDto.prototype, "alt", void 0);
__decorate([
    ValidateIf((o) => o.thumbnail),
    IsUrl(),
    __metadata("design:type", String)
], MediaDto.prototype, "thumbnail", void 0);
//# sourceMappingURL=media.dto.js.map