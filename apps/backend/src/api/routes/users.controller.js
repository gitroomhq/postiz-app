import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, HttpException, Post, Query, Req, Res, } from '@nestjs/common';
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { sign } from 'jsonwebtoken';
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { StripeService } from "../../../../../libraries/nestjs-libraries/src/services/stripe.service";
import { AuthService } from "../../services/auth/auth.service";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { getCookieUrlFromDomain } from "../../../../../libraries/helpers/src/subdomain/subdomain.management";
import { pricing } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/users/users.service";
import { UserDetailDto } from "../../../../../libraries/nestjs-libraries/src/dtos/users/user.details.dto";
import { EmailNotificationsDto } from "../../../../../libraries/nestjs-libraries/src/dtos/users/email-notifications.dto";
import { HttpForbiddenException } from "../../../../../libraries/nestjs-libraries/src/services/exception.filter";
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from "../../../../../libraries/nestjs-libraries/src/user/user.agent";
import { TrackService } from "../../../../../libraries/nestjs-libraries/src/track/track.service";
import { makeId } from "../../../../../libraries/nestjs-libraries/src/services/make.is";
import { AuthorizationActions, Sections } from "../../services/auth/permissions/permission.exception.class";
let UsersController = class UsersController {
    constructor(_subscriptionService, _stripeService, _authService, _orgService, _userService, _trackService) {
        this._subscriptionService = _subscriptionService;
        this._stripeService = _stripeService;
        this._authService = _authService;
        this._orgService = _orgService;
        this._userService = _userService;
        this._trackService = _trackService;
    }
    getAgentMediaSsoUrl(user, organization) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.AGENT_MEDIA_SSO_KEY) {
                throw new HttpException('Agent Media SSO is not configured', 400);
            }
            const token = sign({ id: organization.id, displayName: organization.name }, process.env.AGENT_MEDIA_SSO_KEY);
            return { url: `https://agent-media.ai/sso/${token}` };
        });
    }
    getSelf(user, organization, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            if (!organization) {
                throw new HttpForbiddenException();
            }
            const impersonate = req.cookies.impersonate || req.headers.impersonate;
            // @ts-ignore
            return Object.assign(Object.assign({}, user), { orgId: organization.id, 
                // @ts-ignore
                totalChannels: !process.env.STRIPE_PUBLISHABLE_KEY ? 10000 : ((_a = organization === null || organization === void 0 ? void 0 : organization.subscription) === null || _a === void 0 ? void 0 : _a.totalChannels) || pricing.FREE.channel, 
                // @ts-ignore
                tier: ((_b = organization === null || organization === void 0 ? void 0 : organization.subscription) === null || _b === void 0 ? void 0 : _b.subscriptionTier) || (!process.env.STRIPE_PUBLISHABLE_KEY ? 'ULTIMATE' : 'FREE'), 
                // @ts-ignore
                role: (_c = organization === null || organization === void 0 ? void 0 : organization.users[0]) === null || _c === void 0 ? void 0 : _c.role, 
                // @ts-ignore
                isLifetime: !!((_d = organization === null || organization === void 0 ? void 0 : organization.subscription) === null || _d === void 0 ? void 0 : _d.isLifetime), admin: !!user.isSuperAdmin, impersonate: !!impersonate, isTrailing: !process.env.STRIPE_PUBLISHABLE_KEY ? false : organization === null || organization === void 0 ? void 0 : organization.isTrailing, allowTrial: organization === null || organization === void 0 ? void 0 : organization.allowTrial, streakSince: (organization === null || organization === void 0 ? void 0 : organization.streakSince) || null, 
                // @ts-ignore
                publicApi: ((_e = organization === null || organization === void 0 ? void 0 : organization.users[0]) === null || _e === void 0 ? void 0 : _e.role) === 'SUPERADMIN' || ((_f = organization === null || organization === void 0 ? void 0 : organization.users[0]) === null || _f === void 0 ? void 0 : _f.role) === 'ADMIN' ? organization === null || organization === void 0 ? void 0 : organization.apiKey : '' });
        });
    }
    getPersonalInformation(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._userService.getPersonal(user.id);
        });
    }
    getImpersonate(user, name) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new HttpException('Unauthorized', 400);
            }
            return this._userService.getImpersonateUser(name);
        });
    }
    setImpersonate(user, id, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new HttpException('Unauthorized', 400);
            }
            response.cookie('impersonate', id, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                ? {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'none',
                }
                : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            if (process.env.NOT_SECURED) {
                response.header('impersonate', id);
            }
        });
    }
    changePersonal(user, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._userService.changePersonal(user.id, body);
        });
    }
    getEmailNotifications(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._userService.getEmailNotifications(user.id);
        });
    }
    updateEmailNotifications(user, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._userService.updateEmailNotifications(user.id, body);
        });
    }
    rotateApiKey(organization) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._orgService.updateApiKey(organization.id);
        });
    }
    getSubscription(organization) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = yield this._subscriptionService.getSubscriptionByOrganizationId(organization.id);
            return subscription ? { subscription } : { subscription: undefined };
        });
    }
    tiers() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._stripeService.getPackages();
        });
    }
    joinOrg(user, org, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const getOrgFromCookie = this._authService.getOrgFromCookie(org);
            if (!getOrgFromCookie) {
                return response.status(200).json({ id: null });
            }
            const addedOrg = yield this._orgService.addUserToOrg(user.id, getOrgFromCookie.id, getOrgFromCookie.orgId, getOrgFromCookie.role);
            response.status(200).json({
                id: typeof addedOrg !== 'boolean' ? addedOrg.organizationId : null,
            });
        });
    }
    getOrgs(user) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._orgService.getOrgsByUserId(user.id)).filter((f) => !f.users[0].disabled);
        });
    }
    changeOrg(id, response) {
        response.cookie('showorg', id, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
            }
            : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
        if (process.env.NOT_SECURED) {
            response.header('showorg', id);
        }
        response.status(200).send();
    }
    logout(response) {
        response.header('logout', 'true');
        response.cookie('auth', '', Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
            }
            : {})), { maxAge: -1, expires: new Date(0) }));
        response.cookie('showorg', '', Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
            }
            : {})), { maxAge: -1, expires: new Date(0) }));
        response.cookie('impersonate', '', Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
            ? {
                secure: true,
                httpOnly: true,
                sameSite: 'none',
            }
            : {})), { maxAge: -1, expires: new Date(0) }));
        response.status(200).send();
    }
    trackEvent(res, req, user, ip, userAgent, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const uniqueId = ((_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.track) || makeId(10);
            const fbclid = ((_b = req === null || req === void 0 ? void 0 : req.cookies) === null || _b === void 0 ? void 0 : _b.fbclid) || body.fbclid;
            yield this._trackService.track(uniqueId, ip, userAgent, body.tt, body.additional, fbclid, user);
            if (!req.cookies.track) {
                res.cookie('track', uniqueId, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                        sameSite: 'none',
                    }
                    : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            }
            res.status(200).json({
                track: uniqueId,
            });
        });
    }
};
__decorate([
    Get('/agent-media-sso'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAgentMediaSsoUrl", null);
__decorate([
    Get('/self'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSelf", null);
__decorate([
    Get('/personal'),
    __param(0, GetUserFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getPersonalInformation", null);
__decorate([
    Get('/impersonate'),
    __param(0, GetUserFromRequest()),
    __param(1, Query('name')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getImpersonate", null);
__decorate([
    Post('/impersonate'),
    __param(0, GetUserFromRequest()),
    __param(1, Body('id')),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "setImpersonate", null);
__decorate([
    Post('/personal'),
    __param(0, GetUserFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UserDetailDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePersonal", null);
__decorate([
    Get('/email-notifications'),
    __param(0, GetUserFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getEmailNotifications", null);
__decorate([
    Post('/email-notifications'),
    __param(0, GetUserFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, EmailNotificationsDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateEmailNotifications", null);
__decorate([
    Post('/api-key/rotate'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "rotateApiKey", null);
__decorate([
    Get('/subscription'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSubscription", null);
__decorate([
    Get('/subscription/tiers'),
    CheckPolicies([AuthorizationActions.Create, Sections.ADMIN]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "tiers", null);
__decorate([
    Post('/join-org'),
    __param(0, GetUserFromRequest()),
    __param(1, Body('org')),
    __param(2, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "joinOrg", null);
__decorate([
    Get('/organizations'),
    __param(0, GetUserFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getOrgs", null);
__decorate([
    Post('/change-org'),
    __param(0, Body('id')),
    __param(1, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "changeOrg", null);
__decorate([
    Post('/logout'),
    __param(0, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "logout", null);
__decorate([
    Post('/t'),
    __param(0, Res({ passthrough: true })),
    __param(1, Req()),
    __param(2, GetUserFromRequest()),
    __param(3, RealIP()),
    __param(4, UserAgent()),
    __param(5, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "trackEvent", null);
UsersController = __decorate([
    ApiTags('User'),
    Controller('/user'),
    __metadata("design:paramtypes", [SubscriptionService,
        StripeService,
        AuthService,
        OrganizationService,
        UsersService,
        TrackService])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map