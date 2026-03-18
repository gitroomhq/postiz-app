import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { AddTeamMemberDto } from "../../../../../libraries/nestjs-libraries/src/dtos/settings/add.team.member.dto";
import { ShortlinkPreferenceDto } from "../../../../../libraries/nestjs-libraries/src/dtos/settings/shortlink-preference.dto";
import { ApiTags } from '@nestjs/swagger';
import { AuthorizationActions, Sections } from "../../services/auth/permissions/permission.exception.class";
let SettingsController = class SettingsController {
    constructor(_organizationService) {
        this._organizationService = _organizationService;
    }
    getTeam(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.getTeam(org.id);
        });
    }
    inviteTeamMember(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.inviteTeamMember(org.id, body);
        });
    }
    deleteTeamMember(org, id) {
        return this._organizationService.deleteTeamMember(org, id);
    }
    getShortlinkPreference(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.getShortlinkPreference(org.id);
        });
    }
    updateShortlinkPreference(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationService.updateShortlinkPreference(org.id, body.shortlink);
        });
    }
};
__decorate([
    Get('/team'),
    CheckPolicies([AuthorizationActions.Create, Sections.TEAM_MEMBERS], [AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getTeam", null);
__decorate([
    Post('/team'),
    CheckPolicies([AuthorizationActions.Create, Sections.TEAM_MEMBERS], [AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, AddTeamMemberDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "inviteTeamMember", null);
__decorate([
    Delete('/team/:id'),
    CheckPolicies([AuthorizationActions.Create, Sections.TEAM_MEMBERS], [AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "deleteTeamMember", null);
__decorate([
    Get('/shortlink'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getShortlinkPreference", null);
__decorate([
    Post('/shortlink'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ShortlinkPreferenceDto]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateShortlinkPreference", null);
SettingsController = __decorate([
    ApiTags('Settings'),
    Controller('/settings'),
    __metadata("design:paramtypes", [OrganizationService])
], SettingsController);
export { SettingsController };
//# sourceMappingURL=settings.controller.js.map