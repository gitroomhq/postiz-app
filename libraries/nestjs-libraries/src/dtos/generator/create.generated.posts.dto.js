import { __decorate, __metadata } from "tslib";
import { ArrayMinSize, IsArray, IsDefined, IsNumber, IsString, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
class InnerPost {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], InnerPost.prototype, "post", void 0);
class PostGroup {
}
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ValidateNested({ each: true }),
    Type(() => InnerPost),
    IsDefined(),
    __metadata("design:type", Array)
], PostGroup.prototype, "list", void 0);
export class CreateGeneratedPostsDto {
}
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ValidateNested({ each: true }),
    Type(() => PostGroup),
    IsDefined(),
    __metadata("design:type", Array)
], CreateGeneratedPostsDto.prototype, "posts", void 0);
__decorate([
    IsNumber(),
    IsDefined(),
    __metadata("design:type", Number)
], CreateGeneratedPostsDto.prototype, "week", void 0);
__decorate([
    IsNumber(),
    IsDefined(),
    __metadata("design:type", Number)
], CreateGeneratedPostsDto.prototype, "year", void 0);
__decorate([
    IsString(),
    IsDefined(),
    ValidateIf((o) => !o.url),
    __metadata("design:type", String)
], CreateGeneratedPostsDto.prototype, "url", void 0);
__decorate([
    IsString(),
    IsDefined(),
    ValidateIf((o) => !o.url),
    __metadata("design:type", String)
], CreateGeneratedPostsDto.prototype, "postId", void 0);
//# sourceMappingURL=create.generated.posts.dto.js.map