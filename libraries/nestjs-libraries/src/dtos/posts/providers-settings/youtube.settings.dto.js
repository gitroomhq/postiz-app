import { __decorate, __metadata } from "tslib";
import { IsArray, IsDefined, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { MediaDto } from "../../media/media.dto";
import { Type } from 'class-transformer';
export class YoutubeTagsSettings {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], YoutubeTagsSettings.prototype, "value", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], YoutubeTagsSettings.prototype, "label", void 0);
export class YoutubeSettingsDto {
}
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(100),
    IsDefined(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "title", void 0);
__decorate([
    IsIn(['public', 'private', 'unlisted']),
    IsDefined(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "type", void 0);
__decorate([
    IsIn(['yes', 'no']),
    IsOptional(),
    __metadata("design:type", String)
], YoutubeSettingsDto.prototype, "selfDeclaredMadeForKids", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], YoutubeSettingsDto.prototype, "thumbnail", void 0);
__decorate([
    IsArray(),
    IsOptional(),
    ValidateNested(),
    Type(() => YoutubeTagsSettings),
    __metadata("design:type", Array)
], YoutubeSettingsDto.prototype, "tags", void 0);
//# sourceMappingURL=youtube.settings.dto.js.map