import { __decorate, __metadata } from "tslib";
import { IsBoolean, IsDefined, IsEmail, IsIn, IsString, ValidateIf, } from 'class-validator';
export class AddTeamMemberDto {
}
__decorate([
    IsDefined(),
    IsEmail(),
    ValidateIf((o) => o.sendEmail),
    __metadata("design:type", String)
], AddTeamMemberDto.prototype, "email", void 0);
__decorate([
    IsString(),
    IsIn(['USER', 'ADMIN']),
    __metadata("design:type", String)
], AddTeamMemberDto.prototype, "role", void 0);
__decorate([
    IsDefined(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], AddTeamMemberDto.prototype, "sendEmail", void 0);
//# sourceMappingURL=add.team.member.dto.js.map