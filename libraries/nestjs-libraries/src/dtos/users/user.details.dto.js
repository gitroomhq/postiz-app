import { __decorate, __metadata } from "tslib";
import { MediaDto } from "../media/media.dto";
import { IsOptional, IsString, MinLength, ValidateNested, } from 'class-validator';
export class UserDetailDto {
}
__decorate([
    IsString(),
    MinLength(3),
    __metadata("design:type", String)
], UserDetailDto.prototype, "fullname", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], UserDetailDto.prototype, "bio", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    __metadata("design:type", MediaDto)
], UserDetailDto.prototype, "picture", void 0);
//# sourceMappingURL=user.details.dto.js.map