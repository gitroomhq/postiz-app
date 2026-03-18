import { __decorate, __metadata } from "tslib";
import { IsDefined, IsEmail, IsString, MaxLength, MinLength, ValidateIf, } from 'class-validator';
import { Provider } from '@prisma/client';
export class CreateOrgUserDto {
}
__decorate([
    IsString(),
    MinLength(3),
    MaxLength(64),
    IsDefined(),
    ValidateIf((o) => !o.providerToken),
    __metadata("design:type", String)
], CreateOrgUserDto.prototype, "password", void 0);
__decorate([
    IsString(),
    IsDefined(),
    __metadata("design:type", String)
], CreateOrgUserDto.prototype, "provider", void 0);
__decorate([
    IsString(),
    IsDefined(),
    ValidateIf((o) => !o.password),
    __metadata("design:type", String)
], CreateOrgUserDto.prototype, "providerToken", void 0);
__decorate([
    IsEmail(),
    IsDefined(),
    ValidateIf((o) => !o.providerToken),
    __metadata("design:type", String)
], CreateOrgUserDto.prototype, "email", void 0);
__decorate([
    IsString(),
    IsDefined(),
    MinLength(3),
    MaxLength(128),
    __metadata("design:type", String)
], CreateOrgUserDto.prototype, "company", void 0);
//# sourceMappingURL=create.org.user.dto.js.map