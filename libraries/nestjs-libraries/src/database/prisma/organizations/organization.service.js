import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { OrganizationRepository } from "./organization.repository";
import { NotificationService } from "../notifications/notification.service";
import { AuthService } from "../../../../../helpers/src/auth/auth.service";
import dayjs from 'dayjs';
import { makeId } from "../../../services/make.is";
let OrganizationService = class OrganizationService {
    constructor(_organizationRepository, _notificationsService) {
        this._organizationRepository = _organizationRepository;
        this._notificationsService = _notificationsService;
    }
    createOrgAndUser(body, ip, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationRepository.createOrgAndUser(body, this._notificationsService.hasEmailProvider(), ip, userAgent);
        });
    }
    getCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationRepository.getCount();
        });
    }
    createMaxUser(id, name, saasName, email) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationRepository.createMaxUser(id, name, saasName, email);
        });
    }
    addUserToOrg(userId, id, orgId, role) {
        return this._organizationRepository.addUserToOrg(userId, id, orgId, role);
    }
    getOrgById(id) {
        return this._organizationRepository.getOrgById(id);
    }
    getOrgByApiKey(api) {
        return this._organizationRepository.getOrgByApiKey(api);
    }
    getUserOrg(id) {
        return this._organizationRepository.getUserOrg(id);
    }
    getOrgsByUserId(userId) {
        return this._organizationRepository.getOrgsByUserId(userId);
    }
    updateApiKey(orgId) {
        return this._organizationRepository.updateApiKey(orgId);
    }
    getTeam(orgId) {
        return this._organizationRepository.getTeam(orgId);
    }
    setStreak(organizationId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organizationRepository.setStreak(organizationId, type);
        });
    }
    getOrgByCustomerId(customerId) {
        return this._organizationRepository.getOrgByCustomerId(customerId);
    }
    inviteTeamMember(orgId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeLimit = dayjs().add(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
            const id = makeId(5);
            const url = process.env.FRONTEND_URL +
                `/?org=${AuthService.signJWT(Object.assign(Object.assign({}, body), { orgId, timeLimit, id }))}`;
            if (body.sendEmail) {
                yield this._notificationsService.sendEmail(body.email, 'You have been invited to join an organization', `You have been invited to join an organization. Click <a href="${url}">here</a> to join.<br />The link will expire in 1 hour.`);
            }
            return { url };
        });
    }
    deleteTeamMember(org, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const userOrgs = yield this._organizationRepository.getOrgsByUserId(userId);
            const findOrgToDelete = userOrgs.find((orgUser) => orgUser.id === org.id);
            if (!findOrgToDelete) {
                throw new Error('User is not part of this organization');
            }
            // @ts-ignore
            const myRole = org.users[0].role;
            const userRole = findOrgToDelete.users[0].role;
            const myLevel = myRole === 'USER' ? 0 : myRole === 'ADMIN' ? 1 : 2;
            const userLevel = userRole === 'USER' ? 0 : userRole === 'ADMIN' ? 1 : 2;
            if (myLevel < userLevel) {
                throw new Error('You do not have permission to delete this user');
            }
            return this._organizationRepository.deleteTeamMember(org.id, userId);
        });
    }
    disableOrEnableNonSuperAdminUsers(orgId, disable) {
        return this._organizationRepository.disableOrEnableNonSuperAdminUsers(orgId, disable);
    }
    getShortlinkPreference(orgId) {
        return this._organizationRepository.getShortlinkPreference(orgId);
    }
    updateShortlinkPreference(orgId, shortlink) {
        return this._organizationRepository.updateShortlinkPreference(orgId, shortlink);
    }
};
OrganizationService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [OrganizationRepository,
        NotificationService])
], OrganizationService);
export { OrganizationService };
//# sourceMappingURL=organization.service.js.map