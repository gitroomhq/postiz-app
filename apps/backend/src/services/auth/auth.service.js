import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { CreateOrgUserDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/create.org.user.dto";
import { UsersService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/users/users.service";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { AuthService as AuthChecker } from "../../../../../libraries/helpers/src/auth/auth.service";
import { AuthProviderManager } from "./providers/providers.manager";
import dayjs from 'dayjs';
import { NotificationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { EmailService } from "../../../../../libraries/nestjs-libraries/src/services/email.service";
import { NewsletterService } from "../../../../../libraries/nestjs-libraries/src/newsletter/newsletter.service";
let AuthService = class AuthService {
    constructor(_userService, _organizationService, _notificationService, _emailService, _providerManager) {
        this._userService = _userService;
        this._organizationService = _organizationService;
        this._notificationService = _notificationService;
        this._emailService = _emailService;
        this._providerManager = _providerManager;
    }
    canRegister(provider) {
        return __awaiter(this, void 0, void 0, function* () {
            if (process.env.DISABLE_REGISTRATION !== 'true' ||
                provider === Provider.GENERIC) {
                return true;
            }
            return (yield this._organizationService.getCount()) === 0;
        });
    }
    routeAuth(provider, body, ip, userAgent, addToOrg) {
        return __awaiter(this, void 0, void 0, function* () {
            if (provider === Provider.LOCAL) {
                if (process.env.DISALLOW_PLUS && body.email.includes('+')) {
                    throw new Error('Email with plus sign is not allowed');
                }
                const user = yield this._userService.getUserByEmail(body.email);
                if (body instanceof CreateOrgUserDto) {
                    if (user) {
                        throw new Error('Email already exists');
                    }
                    if (!(yield this.canRegister(provider))) {
                        throw new Error('Registration is disabled');
                    }
                    const create = yield this._organizationService.createOrgAndUser(body, ip, userAgent);
                    const addedOrg = addToOrg && typeof addToOrg !== 'boolean'
                        ? yield this._organizationService.addUserToOrg(create.users[0].user.id, addToOrg.id, addToOrg.orgId, addToOrg.role)
                        : false;
                    const obj = { addedOrg, jwt: yield this.jwt(create.users[0].user) };
                    yield this._emailService.sendEmail(body.email, 'Activate your account', `Click <a href="${process.env.FRONTEND_URL}/auth/activate/${obj.jwt}">here</a> to activate your account`, 'top');
                    return obj;
                }
                if (!user || !AuthChecker.comparePassword(body.password, user.password)) {
                    throw new Error('Invalid user name or password');
                }
                if (!user.activated) {
                    throw new Error('User is not activated');
                }
                return { addedOrg: false, jwt: yield this.jwt(user) };
            }
            const user = yield this.loginOrRegisterProvider(provider, body, ip, userAgent);
            const addedOrg = addToOrg && typeof addToOrg !== 'boolean'
                ? yield this._organizationService.addUserToOrg(user.id, addToOrg.id, addToOrg.orgId, addToOrg.role)
                : false;
            return { addedOrg, jwt: yield this.jwt(user) };
        });
    }
    getOrgFromCookie(cookie) {
        if (!cookie) {
            return false;
        }
        try {
            const getOrg = AuthChecker.verifyJWT(cookie);
            if (dayjs(getOrg.timeLimit).isBefore(dayjs())) {
                return false;
            }
            return getOrg;
        }
        catch (err) {
            return false;
        }
    }
    loginOrRegisterProvider(provider, body, ip, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerInstance = this._providerManager.getProvider(provider);
            const providerUser = yield providerInstance.getUser(body.providerToken);
            if (!providerUser) {
                throw new Error('Invalid provider token');
            }
            const user = yield this._userService.getUserByProvider(providerUser.id, provider);
            if (user) {
                return user;
            }
            if (!(yield this.canRegister(provider))) {
                throw new Error('Registration is disabled');
            }
            const create = yield this._organizationService.createOrgAndUser({
                company: body.company,
                email: providerUser.email,
                password: '',
                provider,
                providerId: providerUser.id,
                datafast_visitor_id: body.datafast_visitor_id,
            }, ip, userAgent);
            this._track('register', providerUser.email, body.datafast_visitor_id).catch((err) => { });
            yield NewsletterService.register(providerUser.email);
            try {
                if (providerInstance === null || providerInstance === void 0 ? void 0 : providerInstance.postRegistration) {
                    yield providerInstance.postRegistration(body.providerToken, create.id);
                }
            }
            catch (err) {
                // Don't fail registration if postRegistration fails
            }
            return create.users[0].user;
        });
    }
    _track(name, email, datafast_visitor_id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (email && datafast_visitor_id && process.env.DATAFAST_API_KEY) {
                try {
                    yield fetch('https://datafa.st/api/v1/goals', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            datafast_visitor_id: datafast_visitor_id,
                            name: name,
                            metadata: {
                                email,
                            },
                        }),
                    });
                }
                catch (err) { }
            }
        });
    }
    forgot(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userService.getUserByEmail(email);
            if (!user || user.providerName !== Provider.LOCAL) {
                return false;
            }
            const resetValues = AuthChecker.signJWT({
                id: user.id,
                expires: dayjs().add(20, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
            });
            yield this._notificationService.sendEmail(user.email, 'Reset your password', `You have requested to reset your passsord. <br />Click <a href="${process.env.FRONTEND_URL}/auth/forgot/${resetValues}">here</a> to reset your password<br />The link will expire in 20 minutes`);
        });
    }
    forgotReturn(body) {
        const user = AuthChecker.verifyJWT(body.token);
        if (dayjs(user.expires).isBefore(dayjs())) {
            return false;
        }
        return this._userService.updatePassword(user.id, body.password);
    }
    activate(code, tracking) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = AuthChecker.verifyJWT(code);
            if (user.id && !user.activated) {
                const getUserAgain = yield this._userService.getUserByEmail(user.email);
                if (getUserAgain.activated) {
                    return false;
                }
                yield this._userService.activateUser(user.id);
                user.activated = true;
                this._track('register', user.email, tracking).catch((err) => { });
                yield NewsletterService.register(user.email);
                return this.jwt(user);
            }
            return false;
        });
    }
    resendActivationEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userService.getUserByEmail(email);
            if (!user) {
                throw new Error('User not found');
            }
            if (user.activated) {
                throw new Error('Account is already activated');
            }
            const jwt = yield this.jwt(user);
            yield this._emailService.sendEmail(user.email, 'Activate your account', `Click <a href="${process.env.FRONTEND_URL}/auth/activate/${jwt}">here</a> to activate your account`, 'top');
            return true;
        });
    }
    oauthLink(provider, query) {
        const providerInstance = this._providerManager.getProvider(provider);
        return providerInstance.generateLink(query);
    }
    checkExists(provider, code) {
        return __awaiter(this, void 0, void 0, function* () {
            const providerInstance = this._providerManager.getProvider(provider);
            const token = yield providerInstance.getToken(code);
            const user = yield providerInstance.getUser(token);
            if (!user) {
                throw new Error('Invalid user');
            }
            const checkExists = yield this._userService.getUserByProvider(user.id, provider);
            if (checkExists) {
                return { jwt: yield this.jwt(checkExists) };
            }
            return { token };
        });
    }
    jwt(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return AuthChecker.signJWT(user);
        });
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UsersService,
        OrganizationService,
        NotificationService,
        EmailService,
        AuthProviderManager])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map