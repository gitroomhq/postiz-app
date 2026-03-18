import { __decorate, __metadata } from "tslib";
import { IsOptional, IsString, IsNumber, Min, Max, } from 'class-validator';
import { Transform } from 'class-transformer';
export class GetPostsListDto {
    constructor() {
        this.page = 0;
        this.limit = 20;
    }
}
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    Transform(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], GetPostsListDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(1),
    Max(100),
    Transform(({ value }) => parseInt(value, 10)),
    __metadata("design:type", Number)
], GetPostsListDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], GetPostsListDto.prototype, "customer", void 0);
//# sourceMappingURL=get.posts.list.dto.js.map