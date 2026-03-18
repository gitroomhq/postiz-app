import { __decorate, __metadata } from "tslib";
import { ArrayMinSize, IsBoolean, IsDefined, IsString, IsUrl, Matches, MinLength, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';
export class RedditFlairDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], RedditFlairDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], RedditFlairDto.prototype, "name", void 0);
export class RedditSettingsDtoInner {
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    JSONSchema({
        description: 'Subreddit must start with /r',
    }),
    __metadata("design:type", String)
], RedditSettingsDtoInner.prototype, "subreddit", void 0);
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], RedditSettingsDtoInner.prototype, "title", void 0);
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], RedditSettingsDtoInner.prototype, "type", void 0);
__decorate([
    IsUrl(),
    IsDefined(),
    ValidateIf((o) => { var _a; return o.type === 'link' && ((_a = o === null || o === void 0 ? void 0 : o.url) === null || _a === void 0 ? void 0 : _a.indexOf('(post:')) === -1; }),
    Matches(/^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/, {
        message: 'Invalid URL',
    }),
    __metadata("design:type", String)
], RedditSettingsDtoInner.prototype, "url", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], RedditSettingsDtoInner.prototype, "is_flair_required", void 0);
__decorate([
    ValidateIf((e) => e.is_flair_required),
    IsDefined(),
    ValidateNested(),
    Type(() => RedditFlairDto),
    __metadata("design:type", RedditFlairDto)
], RedditSettingsDtoInner.prototype, "flair", void 0);
export class RedditSettingsValueDto {
}
__decorate([
    Type(() => RedditSettingsDtoInner),
    IsDefined(),
    ValidateNested(),
    __metadata("design:type", RedditSettingsDtoInner)
], RedditSettingsValueDto.prototype, "value", void 0);
export class RedditSettingsDto {
}
__decorate([
    Type(() => RedditSettingsValueDto),
    ValidateNested({ each: true }),
    ArrayMinSize(1),
    __metadata("design:type", Array)
], RedditSettingsDto.prototype, "subreddit", void 0);
//# sourceMappingURL=reddit.dto.js.map