import { __decorate, __metadata } from "tslib";
import { IsOptional, IsString, IsDateString, } from 'class-validator';
export class GetPostsDto {
}
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], GetPostsDto.prototype, "startDate", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], GetPostsDto.prototype, "endDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GetPostsDto.prototype, "customer", void 0);
//# sourceMappingURL=get.posts.dto.js.map