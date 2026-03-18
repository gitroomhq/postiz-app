import { __decorate, __metadata } from "tslib";
import { IsDefined, IsEmail, IsString, MinLength, ValidateIf, } from 'class-validator';
import { Provider } from '@prisma/client';
export class LoginUserDto {
}
__decorate([
    IsString(),
    IsDefined(),
    ValidateIf((o) => !o.providerToken),
    MinLength(3),
    __metadata("design:type", String)
], LoginUserDto.prototype, "password", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], LoginUserDto.prototype, "provider", void 0);
__decorate([
    IsString(),
    IsDefined(),
    ValidateIf((o) => !o.password),
    __metadata("design:type", String)
], LoginUserDto.prototype, "providerToken", void 0);
__decorate([
    IsEmail(),
    IsDefined(),
    __metadata("design:type", String)
], LoginUserDto.prototype, "email", void 0);
//# sourceMappingURL=login.user.dto.js.map