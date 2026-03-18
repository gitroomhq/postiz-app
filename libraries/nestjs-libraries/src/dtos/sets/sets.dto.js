import { __decorate, __metadata } from "tslib";
import { IsDefined, IsOptional, IsString } from 'class-validator';
export class SetsDto {
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], SetsDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], SetsDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], SetsDto.prototype, "content", void 0);
export class UpdateSetsDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], UpdateSetsDto.prototype, "id", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], UpdateSetsDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], UpdateSetsDto.prototype, "content", void 0);
//# sourceMappingURL=sets.dto.js.map