import { __decorate, __metadata } from "tslib";
import { IsDefined, IsEmail, IsString } from 'class-validator';
export class ResendActivationDto {
}
__decorate([
    IsString(),
    IsDefined(),
    IsEmail(),
    __metadata("design:type", String)
], ResendActivationDto.prototype, "email", void 0);
//# sourceMappingURL=resend-activation.dto.js.map