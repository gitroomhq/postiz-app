import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { UsersService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/users/users.service";
import { getCookieUrlFromDomain } from "../../../../../libraries/helpers/src/subdomain/subdomain.management";
import { HttpForbiddenException } from "../../../../../libraries/nestjs-libraries/src/services/exception.filter";
export const removeAuth = (res) => {
    res.cookie('auth', '', Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: 'none',
        }
        : {})), { expires: new Date(0), maxAge: -1 }));
    res.header('logout', 'true');
};
let AuthMiddleware = class AuthMiddleware {
    constructor(_organizationService, _userService) {
        this._organizationService = _organizationService;
        this._userService = _userService;
    }
    use(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = req.headers.auth || req.cookies.auth;
            if (!auth) {
                throw new HttpForbiddenException();
            }
            try {
                let user = AuthService.verifyJWT(auth);
                const orgHeader = req.cookies.showorg || req.headers.showorg;
                if (!user) {
                    throw new HttpForbiddenException();
                }
                if (!user.activated) {
                    throw new HttpForbiddenException();
                }
                const impersonate = req.cookies.impersonate || req.headers.impersonate;
                if ((user === null || user === void 0 ? void 0 : user.isSuperAdmin) && impersonate) {
                    const loadImpersonate = yield this._organizationService.getUserOrg(impersonate);
                    if (loadImpersonate) {
                        user = loadImpersonate.user;
                        user.isSuperAdmin = true;
                        delete user.password;
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        req.user = user;
                        // @ts-ignore
                        loadImpersonate.organization.users =
                            loadImpersonate.organization.users.filter((f) => f.userId === user.id);
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-expect-error
                        req.org = loadImpersonate.organization;
                        next();
                        return;
                    }
                }
                delete user.password;
                const organization = (yield this._organizationService.getOrgsByUserId(user.id)).filter((f) => !f.users[0].disabled);
                const setOrg = organization.find((org) => org.id === orgHeader) || organization[0];
                if (!organization) {
                    throw new HttpForbiddenException();
                }
                if (!setOrg.apiKey) {
                    yield this._organizationService.updateApiKey(setOrg.id);
                }
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                req.user = user;
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                req.org = setOrg;
            }
            catch (err) {
                throw new HttpForbiddenException();
            }
            next();
        });
    }
};
AuthMiddleware = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [OrganizationService,
        UsersService])
], AuthMiddleware);
export { AuthMiddleware };
//# sourceMappingURL=auth.middleware.js.map