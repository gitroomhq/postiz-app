import { __decorate, __metadata } from "tslib";
import { ArrayMinSize, IsArray, IsDefined, IsOptional, IsString, Matches, MinLength, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaDto } from "../../media/media.dto";
export class HashnodeTagsSettings {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], HashnodeTagsSettings.prototype, "value", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], HashnodeTagsSettings.prototype, "label", void 0);
export class HashnodeSettingsDto {
}
__decorate([
    IsString(),
    MinLength(6),
    IsDefined(),
    __metadata("design:type", String)
], HashnodeSettingsDto.prototype, "title", void 0);
__decorate([
    IsString(),
    MinLength(2),
    IsOptional(),
    __metadata("design:type", String)
], HashnodeSettingsDto.prototype, "subtitle", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], HashnodeSettingsDto.prototype, "main_image", void 0);
__decorate([
    IsOptional(),
    IsString(),
    ValidateIf((o) => o.canonical && o.canonical.indexOf('(post:') === -1),
    Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL',
    }),
    __metadata("design:type", String)
], HashnodeSettingsDto.prototype, "canonical", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], HashnodeSettingsDto.prototype, "publication", void 0);
__decorate([
    IsArray(),
    ArrayMinSize(1),
    Type(() => HashnodeTagsSettings),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], HashnodeSettingsDto.prototype, "tags", void 0);
//# sourceMappingURL=hashnode.settings.dto.js.map