import { __decorate, __metadata } from "tslib";
import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class MeweDto {
}
__decorate([
    IsIn(['timeline', 'group']),
    JSONSchema({
        description: 'Where to post: timeline or group',
    }),
    __metadata("design:type", String)
], MeweDto.prototype, "postType", void 0);
__decorate([
    ValidateIf((o) => o.postType === 'group'),
    MinLength(1),
    IsString(),
    JSONSchema({
        description: 'Group must be an id',
    }),
    IsOptional(),
    __metadata("design:type", String)
], MeweDto.prototype, "group", void 0);
//# sourceMappingURL=mewe.dto.js.map