import { __decorate, __metadata } from "tslib";
import { IsArray, IsDefined, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class IntegrationValidateTimeDto {
}
__decorate([
    IsDefined(),
    IsNumber(),
    __metadata("design:type", Number)
], IntegrationValidateTimeDto.prototype, "time", void 0);
export class IntegrationTimeDto {
}
__decorate([
    Type(() => IntegrationValidateTimeDto),
    IsArray(),
    IsDefined(),
    ValidateNested({ each: true }),
    __metadata("design:type", Array)
], IntegrationTimeDto.prototype, "time", void 0);
//# sourceMappingURL=integration.time.dto.js.map