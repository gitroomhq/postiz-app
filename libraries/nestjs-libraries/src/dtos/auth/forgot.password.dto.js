import { __decorate, __metadata } from "tslib";
import { IsDefined, IsEmail, IsString } from 'class-validator';
export class ForgotPasswordDto {
}
__decorate([
    IsString(),
    IsDefined(),
    IsEmail(),
    __metadata("design:type", String)
], ForgotPasswordDto.prototype, "email", void 0);
//# sourceMappingURL=forgot.password.dto.js.map