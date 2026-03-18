import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class FieldsDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], FieldsDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], FieldsDto.prototype, "value", void 0);
export class PlugDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], PlugDto.prototype, "func", void 0);
__decorate([
    Type(() => FieldsDto),
    ValidateNested({ each: true }),
    IsDefined(),
    __metadata("design:type", Array)
], PlugDto.prototype, "fields", void 0);
//# sourceMappingURL=plug.dto.js.map