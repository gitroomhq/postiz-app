import { __decorate, __metadata } from "tslib";
import { IsDefined, IsIn, IsNumber, IsOptional } from 'class-validator';
export class StarsListDto {
}
__decorate([
    IsNumber(),
    IsDefined(),
    __metadata("design:type", Number)
], StarsListDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    IsIn(['login', 'totalStars', 'stars', 'date', 'forks', 'totalForks']),
    __metadata("design:type", String)
], StarsListDto.prototype, "key", void 0);
__decorate([
    IsOptional(),
    IsIn(['desc', 'asc']),
    __metadata("design:type", String)
], StarsListDto.prototype, "state", void 0);
//# sourceMappingURL=stars.list.dto.js.map