import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString, MinLength, ValidateNested, } from 'class-validator';
import { MediaDto } from "../../media/media.dto";
import { Type } from 'class-transformer';
export class WordpressDto {
}
__decorate([
    IsString(),
    MinLength(2),
    IsDefined(),
    __metadata("design:type", String)
], WordpressDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => MediaDto),
    __metadata("design:type", MediaDto)
], WordpressDto.prototype, "main_image", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], WordpressDto.prototype, "type", void 0);
//# sourceMappingURL=wordpress.dto.js.map