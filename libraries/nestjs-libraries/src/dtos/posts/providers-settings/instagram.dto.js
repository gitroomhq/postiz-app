import { __decorate, __metadata } from "tslib";
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsIn, IsString, ValidateNested, IsOptional, } from 'class-validator';
export class Collaborators {
}
__decorate([
    IsDefined(),
    IsString(),
    __metadata("design:type", String)
], Collaborators.prototype, "label", void 0);
export class InstagramDto {
}
__decorate([
    IsIn(['post', 'story']),
    IsDefined(),
    __metadata("design:type", String)
], InstagramDto.prototype, "post_type", void 0);
__decorate([
    IsOptional(),
    __metadata("design:type", Boolean)
], InstagramDto.prototype, "is_trial_reel", void 0);
__decorate([
    IsIn(['MANUAL', 'SS_PERFORMANCE']),
    IsOptional(),
    __metadata("design:type", String)
], InstagramDto.prototype, "graduation_strategy", void 0);
__decorate([
    Type(() => Collaborators),
    ValidateNested({ each: true }),
    IsArray(),
    IsOptional(),
    __metadata("design:type", Array)
], InstagramDto.prototype, "collaborators", void 0);
//# sourceMappingURL=instagram.dto.js.map