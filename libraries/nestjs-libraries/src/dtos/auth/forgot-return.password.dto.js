import { __decorate, __metadata } from "tslib";
import { IsDefined, IsIn, IsString, MinLength, ValidateIf, } from 'class-validator';
import { makeId } from "../../services/make.is";
export class ForgotReturnPasswordDto {
}
__decorate([
    IsString(),
    IsDefined(),
    MinLength(3),
    __metadata("design:type", String)
], ForgotReturnPasswordDto.prototype, "password", void 0);
__decorate([
    IsString(),
    IsDefined(),
    IsIn([makeId(10)], {
        message: 'Passwords do not match',
    }),
    ValidateIf((o) => o.password !== o.repeatPassword),
    __metadata("design:type", String)
], ForgotReturnPasswordDto.prototype, "repeatPassword", void 0);
__decorate([
    IsString(),
    IsDefined(),
    MinLength(5),
    __metadata("design:type", String)
], ForgotReturnPasswordDto.prototype, "token", void 0);
//# sourceMappingURL=forgot-return.password.dto.js.map