import { __decorate, __metadata } from "tslib";
import { ArrayMaxSize, IsArray, IsDefined, IsOptional, IsString, Matches, MinLength, ValidateIf, ValidateNested, } from 'class-validator';
import { MediaDto } from "../../media/media.dto";
import { Type } from 'class-transformer';
import { DevToTagsSettingsDto } from "./dev.to.tags.settings.dto";
export class DevToSettingsDto {
    constructor() {
        this.tags = [];
    }
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], DevToSettingsDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], DevToSettingsDto.prototype, "main_image", void 0);
__decorate([
    IsOptional(),
    IsString(),
    ValidateIf((o) => o.canonical && o.canonical.indexOf('(post:') === -1),
    Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL',
    }),
    __metadata("design:type", String)
], DevToSettingsDto.prototype, "canonical", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], DevToSettingsDto.prototype, "organization", void 0);
__decorate([
    IsArray(),
    ArrayMaxSize(4),
    Type(() => DevToTagsSettingsDto),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], DevToSettingsDto.prototype, "tags", void 0);
//# sourceMappingURL=dev.to.settings.dto.js.map