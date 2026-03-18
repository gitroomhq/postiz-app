import { __decorate, __metadata } from "tslib";
import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';
export class GeneratorDto {
}
__decorate([
    IsString(),
    MinLength(10),
    __metadata("design:type", String)
], GeneratorDto.prototype, "research", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], GeneratorDto.prototype, "isPicture", void 0);
__decorate([
    IsString(),
    IsIn(['one_short', 'one_long', 'thread_short', 'thread_long']),
    __metadata("design:type", String)
], GeneratorDto.prototype, "format", void 0);
__decorate([
    IsString(),
    IsIn(['personal', 'company']),
    __metadata("design:type", String)
], GeneratorDto.prototype, "tone", void 0);
//# sourceMappingURL=generator.dto.js.map