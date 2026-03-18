import { __awaiter, __decorate, __metadata } from "tslib";
import { HttpStatus, Injectable } from '@nestjs/common';
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { OAuthService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/oauth/oauth.service";
import { HttpForbiddenException } from "../../../../../libraries/nestjs-libraries/src/services/exception.filter";
let PublicAuthMiddleware = class PublicAuthMiddleware {
    constructor(_organizationService, _oauthService) {
        this._organizationService = _organizationService;
        this._oauthService = _oauthService;
    }
    use(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const auth = (req.headers.authorization ||
                req.headers.Authorization);
            if (!auth) {
                res.status(HttpStatus.UNAUTHORIZED).json({ msg: 'No API Key found' });
                return;
            }
            try {
                if (auth.startsWith('pos_')) {
                    const authorization = yield this._oauthService.getOrgByOAuthToken(auth);
                    if (!authorization) {
                        res
                            .status(HttpStatus.UNAUTHORIZED)
                            .json({ msg: 'Invalid OAuth token' });
                        return;
                    }
                    const org = authorization.organization;
                    if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {
                        res
                            .status(HttpStatus.UNAUTHORIZED)
                            .json({ msg: 'No subscription found' });
                        return;
                    }
                    // @ts-ignore
                    req.org = Object.assign(Object.assign({}, org), { users: [{ users: { role: 'SUPERADMIN' } }] });
                }
                else {
                    const org = yield this._organizationService.getOrgByApiKey(auth);
                    if (!org) {
                        res
                            .status(HttpStatus.UNAUTHORIZED)
                            .json({ msg: 'Invalid API key' });
                        return;
                    }
                    if (!!process.env.STRIPE_SECRET_KEY && !org.subscription) {
                        res
                            .status(HttpStatus.UNAUTHORIZED)
                            .json({ msg: 'No subscription found' });
                        return;
                    }
                    // @ts-ignore
                    req.org = Object.assign(Object.assign({}, org), { users: [{ users: { role: 'SUPERADMIN' } }] });
                }
            }
            catch (err) {
                throw new HttpForbiddenException();
            }
            next();
        });
    }
};
PublicAuthMiddleware = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [OrganizationService,
        OAuthService])
], PublicAuthMiddleware);
export { PublicAuthMiddleware };
//# sourceMappingURL=public.auth.middleware.js.map