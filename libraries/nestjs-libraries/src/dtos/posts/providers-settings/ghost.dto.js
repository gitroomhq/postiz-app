import { __decorate, __metadata } from "tslib";
import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString, MinLength, ValidateNested, IsDateString, } from 'class-validator';
import { MediaDto } from "../../media/media.dto";
import { Type } from 'class-transformer';
export var GhostPostStatus;
(function (GhostPostStatus) {
    GhostPostStatus["PUBLISHED"] = "published";
    GhostPostStatus["DRAFT"] = "draft";
    GhostPostStatus["SCHEDULED"] = "scheduled";
})(GhostPostStatus || (GhostPostStatus = {}));
export var GhostVisibility;
(function (GhostVisibility) {
    GhostVisibility["PUBLIC"] = "public";
    GhostVisibility["MEMBERS"] = "members";
    GhostVisibility["PAID"] = "paid";
})(GhostVisibility || (GhostVisibility = {}));
export class GhostDto {
    constructor() {
        this.status = GhostPostStatus.PUBLISHED;
        this.visibility = GhostVisibility.PUBLIC;
    }
}
__decorate([
    IsString(),
    MinLength(1),
    IsDefined(),
    __metadata("design:type", String)
], GhostDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "slug", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "custom_excerpt", void 0);
__decorate([
    IsEnum(GhostPostStatus),
    IsOptional(),
    __metadata("design:type", String)
], GhostDto.prototype, "status", void 0);
__decorate([
    IsEnum(GhostVisibility),
    IsOptional(),
    __metadata("design:type", String)
], GhostDto.prototype, "visibility", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], GhostDto.prototype, "feature_image", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "feature_image_caption", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "feature_image_alt", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], GhostDto.prototype, "tags", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], GhostDto.prototype, "authors", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "canonical_url", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "meta_title", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "meta_description", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "og_image", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "og_title", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "og_description", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "twitter_image", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "twitter_title", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "twitter_description", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], GhostDto.prototype, "published_at", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "email_subject", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GhostDto.prototype, "newsletter_id", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], GhostDto.prototype, "tiers", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], GhostDto.prototype, "email_only", void 0);
//# sourceMappingURL=ghost.dto.js.map