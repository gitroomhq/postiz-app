import { __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { UsersRepository } from "./users.repository";
import { OrganizationRepository } from "../organizations/organization.repository";
let UsersService = class UsersService {
    constructor(_usersRepository, _organizationRepository) {
        this._usersRepository = _usersRepository;
        this._organizationRepository = _organizationRepository;
    }
    getUserByEmail(email) {
        return this._usersRepository.getUserByEmail(email);
    }
    getUserById(id) {
        return this._usersRepository.getUserById(id);
    }
    getImpersonateUser(name) {
        return this._organizationRepository.getImpersonateUser(name);
    }
    getUserByProvider(providerId, provider) {
        return this._usersRepository.getUserByProvider(providerId, provider);
    }
    activateUser(id) {
        return this._usersRepository.activateUser(id);
    }
    updatePassword(id, password) {
        return this._usersRepository.updatePassword(id, password);
    }
    getPersonal(userId) {
        return this._usersRepository.getPersonal(userId);
    }
    changePersonal(userId, body) {
        return this._usersRepository.changePersonal(userId, body);
    }
    getEmailNotifications(userId) {
        return this._usersRepository.getEmailNotifications(userId);
    }
    updateEmailNotifications(userId, body) {
        return this._usersRepository.updateEmailNotifications(userId, body);
    }
};
UsersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UsersRepository,
        OrganizationRepository])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map