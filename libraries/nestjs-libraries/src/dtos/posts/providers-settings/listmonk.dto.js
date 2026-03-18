import { __decorate, __metadata } from "tslib";
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
export class ListmonkDto {
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], ListmonkDto.prototype, "subject", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], ListmonkDto.prototype, "preview", void 0);
__decorate([
    IsString(),
    JSONSchema({
        description: 'List must be an id',
    }),
    __metadata("design:type", String)
], ListmonkDto.prototype, "list", void 0);
__decorate([
    IsString(),
    IsOptional(),
    JSONSchema({
        description: 'Template must be an id',
    }),
    __metadata("design:type", String)
], ListmonkDto.prototype, "template", void 0);
//# sourceMappingURL=listmonk.dto.js.map