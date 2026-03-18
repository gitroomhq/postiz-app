import { __decorate, __metadata } from "tslib";
import { IsBoolean, IsDefined, IsString } from 'class-validator';
export class SignatureDto {
}
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], SignatureDto.prototype, "content", void 0);
__decorate([
    IsBoolean(),
    IsDefined(),
    __metadata("design:type", Boolean)
], SignatureDto.prototype, "autoAdd", void 0);
//# sourceMappingURL=signature.dto.js.map