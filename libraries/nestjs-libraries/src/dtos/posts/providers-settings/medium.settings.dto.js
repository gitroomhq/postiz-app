import { __decorate, __metadata } from "tslib";
import { ArrayMaxSize, IsArray, IsDefined, IsOptional, IsString, Matches, MinLength, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
export class MediumTagsSettings {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], MediumTagsSettings.prototype, "value", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], MediumTagsSettings.prototype, "label", void 0);
export class MediumSettingsDto {
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], MediumSettingsDto.prototype, "title", void 0);
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], MediumSettingsDto.prototype, "subtitle", void 0);
__decorate([
    IsOptional(),
    IsString(),
    ValidateIf((o) => o.canonical && o.canonical.indexOf('(post:') === -1),
    Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL',
    }),
    __metadata("design:type", String)
], MediumSettingsDto.prototype, "canonical", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], MediumSettingsDto.prototype, "publication", void 0);
__decorate([
    IsArray(),
    ArrayMaxSize(4),
    IsOptional(),
    ValidateNested({ each: true }),
    Type(p => MediumTagsSettings),
    __metadata("design:type", Array)
], MediumSettingsDto.prototype, "tags", void 0);
//# sourceMappingURL=medium.settings.dto.js.map