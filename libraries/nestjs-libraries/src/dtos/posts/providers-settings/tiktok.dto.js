import { __decorate, __metadata } from "tslib";
import { IsBoolean, ValidateIf, IsIn, IsString, MaxLength, IsOptional } from 'class-validator';
export class TikTokDto {
}
__decorate([
    ValidateIf((p) => p.title),
    MaxLength(90),
    __metadata("design:type", String)
], TikTokDto.prototype, "title", void 0);
__decorate([
    IsIn([
        'PUBLIC_TO_EVERYONE',
        'MUTUAL_FOLLOW_FRIENDS',
        'FOLLOWER_OF_CREATOR',
        'SELF_ONLY',
    ]),
    IsString(),
    __metadata("design:type", String)
], TikTokDto.prototype, "privacy_level", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "duet", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "stitch", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "comment", void 0);
__decorate([
    IsIn(['yes', 'no']),
    __metadata("design:type", String)
], TikTokDto.prototype, "autoAddMusic", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "brand_content_toggle", void 0);
__decorate([
    IsBoolean(),
    IsOptional(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "video_made_with_ai", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], TikTokDto.prototype, "brand_organic_toggle", void 0);
__decorate([
    IsIn(['DIRECT_POST', 'UPLOAD']),
    IsString(),
    __metadata("design:type", String)
], TikTokDto.prototype, "content_posting_method", void 0);
//# sourceMappingURL=tiktok.dto.js.map