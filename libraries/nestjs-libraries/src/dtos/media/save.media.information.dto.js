import { __decorate, __metadata } from "tslib";
import { IsNumber, IsString, IsUrl, ValidateIf } from 'class-validator';
export class SaveMediaInformationDto {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], SaveMediaInformationDto.prototype, "id", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], SaveMediaInformationDto.prototype, "alt", void 0);
__decorate([
    IsUrl(),
    ValidateIf((o) => !!o.thumbnail),
    __metadata("design:type", String)
], SaveMediaInformationDto.prototype, "thumbnail", void 0);
__decorate([
    IsNumber(),
    ValidateIf((o) => !!o.thumbnailTimestamp),
    __metadata("design:type", Number)
], SaveMediaInformationDto.prototype, "thumbnailTimestamp", void 0);
//# sourceMappingURL=save.media.information.dto.js.map