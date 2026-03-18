import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class WhopDto {
}
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Company ID',
    }),
    __metadata("design:type", String)
], WhopDto.prototype, "company", void 0);
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    JSONSchema({
        description: 'Experience ID for the Whop forum',
    }),
    __metadata("design:type", String)
], WhopDto.prototype, "experience", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], WhopDto.prototype, "title", void 0);
//# sourceMappingURL=whop.dto.js.map