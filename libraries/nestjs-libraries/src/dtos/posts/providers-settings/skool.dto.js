import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class SkoolDto {
}
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Group must be an id',
    }),
    __metadata("design:type", String)
], SkoolDto.prototype, "group", void 0);
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Label must be an id',
    }),
    __metadata("design:type", String)
], SkoolDto.prototype, "label", void 0);
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Title of the post',
    }),
    __metadata("design:type", String)
], SkoolDto.prototype, "title", void 0);
//# sourceMappingURL=skool.dto.js.map