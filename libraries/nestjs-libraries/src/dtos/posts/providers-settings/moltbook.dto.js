import { __decorate, __metadata } from "tslib";
import { IsDefined, IsString, MinLength } from 'class-validator';
export class MoltbookDto {
}
__decorate([
    MinLength(1),
    IsDefined(),
    IsString(),
    __metadata("design:type", String)
], MoltbookDto.prototype, "submolt", void 0);
//# sourceMappingURL=moltbook.dto.js.map