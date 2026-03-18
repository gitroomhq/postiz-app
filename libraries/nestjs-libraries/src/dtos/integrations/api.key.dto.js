import { __decorate, __metadata } from "tslib";
import { IsString, MinLength } from 'class-validator';
export class ApiKeyDto {
}
__decorate([
    IsString(),
    MinLength(4, {
        message: 'Must be at least 4 characters',
    }),
    __metadata("design:type", String)
], ApiKeyDto.prototype, "api", void 0);
//# sourceMappingURL=api.key.dto.js.map