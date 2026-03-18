import { __decorate, __metadata } from "tslib";
import { ArrayMinSize, IsDefined, IsOptional, IsString, IsUrl, MinLength, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
export class LemmySettingsDtoInner {
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], LemmySettingsDtoInner.prototype, "subreddit", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], LemmySettingsDtoInner.prototype, "id", void 0);
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], LemmySettingsDtoInner.prototype, "title", void 0);
__decorate([
    ValidateIf((o) => o.url),
    IsOptional(),
    IsUrl(),
    __metadata("design:type", String)
], LemmySettingsDtoInner.prototype, "url", void 0);
export class LemmySettingsValueDto {
}
__decorate([
    Type(() => LemmySettingsDtoInner),
    IsDefined(),
    ValidateNested(),
    __metadata("design:type", LemmySettingsDtoInner)
], LemmySettingsValueDto.prototype, "value", void 0);
export class LemmySettingsDto {
}
__decorate([
    Type(() => LemmySettingsValueDto),
    ValidateNested({ each: true }),
    ArrayMinSize(1),
    __metadata("design:type", Array)
], LemmySettingsDto.prototype, "subreddit", void 0);
//# sourceMappingURL=lemmy.dto.js.map