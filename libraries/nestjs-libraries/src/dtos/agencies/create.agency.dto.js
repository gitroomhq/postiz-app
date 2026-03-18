import { __decorate, __metadata } from "tslib";
import { ArrayMaxSize, ArrayMinSize, IsDefined, IsIn, IsOptional, IsString, IsUrl, MinLength, ValidateIf, } from 'class-validator';
import { Type } from 'class-transformer';
export class CreateAgencyLogoDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], CreateAgencyLogoDto.prototype, "id", void 0);
export class CreateAgencyDto {
}
__decorate([
    IsString(),
    MinLength(3),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "name", void 0);
__decorate([
    IsUrl(),
    IsDefined(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "website", void 0);
__decorate([
    IsUrl(),
    ValidateIf((o) => o.facebook),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "facebook", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "instagram", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "twitter", void 0);
__decorate([
    IsUrl(),
    ValidateIf((o) => o.linkedIn),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "linkedIn", void 0);
__decorate([
    IsUrl(),
    ValidateIf((o) => o.youtube),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "youtube", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "tiktok", void 0);
__decorate([
    Type(() => CreateAgencyLogoDto),
    __metadata("design:type", CreateAgencyLogoDto)
], CreateAgencyDto.prototype, "logo", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "shortDescription", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateAgencyDto.prototype, "description", void 0);
__decorate([
    IsString({
        each: true,
    }),
    ArrayMinSize(1),
    ArrayMaxSize(3),
    IsIn([
        'Real Estate',
        'Fashion',
        'Health and Fitness',
        'Beauty',
        'Travel',
        'Food',
        'Tech',
        'Gaming',
        'Parenting',
        'Education',
        'Business',
        'Finance',
        'DIY',
        'Pets',
        'Lifestyle',
        'Sports',
        'Entertainment',
        'Art',
        'Photography',
        'Sustainability',
    ], {
        each: true,
    }),
    __metadata("design:type", Array)
], CreateAgencyDto.prototype, "niches", void 0);
//# sourceMappingURL=create.agency.dto.js.map