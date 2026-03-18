import { __decorate, __metadata } from "tslib";
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString, Validate, ValidateIf, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaDto } from "../media/media.dto";
import { allProviders, EmptySettings, } from "./providers-settings/all.providers.settings";
import { ValidContent } from "../../../../helpers/src/utils/valid.images";
export class Integration {
}
__decorate([
    IsDefined(),
    IsString(),
    __metadata("design:type", String)
], Integration.prototype, "id", void 0);
export class PostContent {
}
__decorate([
    IsDefined(),
    IsString(),
    Validate(ValidContent),
    __metadata("design:type", String)
], PostContent.prototype, "content", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], PostContent.prototype, "id", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], PostContent.prototype, "delay", void 0);
__decorate([
    IsArray(),
    Type(() => MediaDto),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], PostContent.prototype, "image", void 0);
export class Post {
}
__decorate([
    IsDefined(),
    Type(() => Integration),
    ValidateNested(),
    __metadata("design:type", Integration)
], Post.prototype, "integration", void 0);
__decorate([
    IsDefined(),
    ArrayMinSize(1),
    IsArray(),
    Type(() => PostContent),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], Post.prototype, "value", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], Post.prototype, "group", void 0);
__decorate([
    ValidateIf((o) => o.type !== 'draft'),
    ValidateNested(),
    Type(() => EmptySettings, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: '__type',
            subTypes: allProviders(EmptySettings),
        },
    }),
    __metadata("design:type", Object)
], Post.prototype, "settings", void 0);
class Tags {
}
__decorate([
    IsDefined(),
    IsString(),
    __metadata("design:type", String)
], Tags.prototype, "value", void 0);
__decorate([
    IsDefined(),
    IsString(),
    __metadata("design:type", String)
], Tags.prototype, "label", void 0);
export class CreatePostDto {
}
__decorate([
    IsDefined(),
    IsIn(['draft', 'schedule', 'now', 'update']),
    __metadata("design:type", String)
], CreatePostDto.prototype, "type", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "order", void 0);
__decorate([
    IsDefined(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreatePostDto.prototype, "shortLink", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CreatePostDto.prototype, "inter", void 0);
__decorate([
    IsDefined(),
    IsDateString(),
    __metadata("design:type", String)
], CreatePostDto.prototype, "date", void 0);
__decorate([
    IsArray(),
    IsDefined(),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], CreatePostDto.prototype, "tags", void 0);
__decorate([
    IsDefined(),
    Type(() => Post),
    IsArray(),
    ValidateNested({ each: true }),
    ArrayMinSize(1),
    __metadata("design:type", Array)
], CreatePostDto.prototype, "posts", void 0);
//# sourceMappingURL=create.post.dto.js.map