import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, Param, Post, Query, Req, Res, } from '@nestjs/common';
import { CreateOrgUserDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/create.org.user.dto";
import { LoginUserDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/login.user.dto";
import { AuthService } from "../../services/auth/auth.service";
import { ForgotReturnPasswordDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/forgot-return.password.dto";
import { ForgotPasswordDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/forgot.password.dto";
import { ResendActivationDto } from "../../../../../libraries/nestjs-libraries/src/dtos/auth/resend-activation.dto";
import { ApiTags } from '@nestjs/swagger';
import { getCookieUrlFromDomain } from "../../../../../libraries/helpers/src/subdomain/subdomain.management";
import { EmailService } from "../../../../../libraries/nestjs-libraries/src/services/email.service";
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from "../../../../../libraries/nestjs-libraries/src/user/user.agent";
import { Provider } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
let AuthController = class AuthController {
    constructor(_authService, _emailService) {
        this._authService = _authService;
        this._emailService = _emailService;
    }
    canRegister() {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                register: yield this._authService.canRegister(Provider.LOCAL),
            };
        });
    }
    register(req, body, response, ip, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const getOrgFromCookie = this._authService.getOrgFromCookie((_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.org);
                const { jwt, addedOrg } = yield this._authService.routeAuth(body.provider, body, ip, userAgent, getOrgFromCookie);
                const activationRequired = body.provider === 'LOCAL' && this._emailService.hasProvider();
                if (activationRequired) {
                    response.header('activate', 'true');
                    response.status(200).json({ activate: true });
                    return;
                }
                response.cookie('auth', jwt, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                        sameSite: 'none',
                    }
                    : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
                if (process.env.NOT_SECURED) {
                    response.header('auth', jwt);
                }
                if (typeof addedOrg !== 'boolean' && (addedOrg === null || addedOrg === void 0 ? void 0 : addedOrg.organizationId)) {
                    response.cookie('showorg', addedOrg.organizationId, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                        ? {
                            secure: true,
                            httpOnly: true,
                            sameSite: 'none',
                        }
                        : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
                    if (process.env.NOT_SECURED) {
                        response.header('showorg', addedOrg.organizationId);
                    }
                }
                Sentry.metrics.count('new_user', 1);
                response.header('onboarding', 'true');
                response.status(200).json({
                    register: true,
                });
            }
            catch (e) {
                response.status(400).send(e.message);
            }
        });
    }
    login(req, body, response, ip, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const getOrgFromCookie = this._authService.getOrgFromCookie((_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.org);
                const { jwt, addedOrg } = yield this._authService.routeAuth(body.provider, body, ip, userAgent, getOrgFromCookie);
                response.cookie('auth', jwt, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                        sameSite: 'none',
                    }
                    : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
                if (process.env.NOT_SECURED) {
                    response.header('auth', jwt);
                }
                if (typeof addedOrg !== 'boolean' && (addedOrg === null || addedOrg === void 0 ? void 0 : addedOrg.organizationId)) {
                    response.cookie('showorg', addedOrg.organizationId, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                        ? {
                            secure: true,
                            httpOnly: true,
                            sameSite: 'none',
                        }
                        : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
                    if (process.env.NOT_SECURED) {
                        response.header('showorg', addedOrg.organizationId);
                    }
                }
                response.header('reload', 'true');
                response.status(200).json({
                    login: true,
                });
            }
            catch (e) {
                response.status(400).send(e.message);
            }
        });
    }
    forgot(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._authService.forgot(body.email);
                return {
                    forgot: true,
                };
            }
            catch (e) {
                return {
                    forgot: false,
                };
            }
        });
    }
    forgotReturn(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const reset = yield this._authService.forgotReturn(body);
            return {
                reset: !!reset,
            };
        });
    }
    oauthLink(provider, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._authService.oauthLink(provider, query);
        });
    }
    activate(code, datafast_visitor_id, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const activate = yield this._authService.activate(code, datafast_visitor_id);
            if (!activate) {
                return response.status(200).json({ can: false });
            }
            response.cookie('auth', activate, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                ? {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'none',
                }
                : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            if (process.env.NOT_SECURED) {
                response.header('auth', activate);
            }
            response.header('onboarding', 'true');
            return response.status(200).json({ can: true });
        });
    }
    resendActivation(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._authService.resendActivationEmail(body.email);
                return {
                    success: true,
                };
            }
            catch (e) {
                return {
                    success: false,
                    message: e.message,
                };
            }
        });
    }
    oauthExists(code, provider, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const { jwt, token } = yield this._authService.checkExists(provider, code);
            if (token) {
                return response.json({ token });
            }
            response.cookie('auth', jwt, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                ? {
                    secure: true,
                    httpOnly: true,
                    sameSite: 'none',
                }
                : {})), { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            if (process.env.NOT_SECURED) {
                response.header('auth', jwt);
            }
            response.header('reload', 'true');
            response.status(200).json({
                login: true,
            });
        });
    }
};
__decorate([
    Get('/can-register'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "canRegister", null);
__decorate([
    Post('/register'),
    __param(0, Req()),
    __param(1, Body()),
    __param(2, Res({ passthrough: false })),
    __param(3, RealIP()),
    __param(4, UserAgent()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, CreateOrgUserDto, Object, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    Post('/login'),
    __param(0, Req()),
    __param(1, Body()),
    __param(2, Res({ passthrough: false })),
    __param(3, RealIP()),
    __param(4, UserAgent()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, LoginUserDto, Object, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Post('/forgot'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgot", null);
__decorate([
    Post('/forgot-return'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForgotReturnPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotReturn", null);
__decorate([
    Get('/oauth/:provider'),
    __param(0, Param('provider')),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "oauthLink", null);
__decorate([
    Post('/activate'),
    __param(0, Body('code')),
    __param(1, Body('datafast_visitor_id')),
    __param(2, Res({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "activate", null);
__decorate([
    Post('/resend-activation'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResendActivationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendActivation", null);
__decorate([
    Post('/oauth/:provider/exists'),
    __param(0, Body('code')),
    __param(1, Param('provider')),
    __param(2, Res({ passthrough: false })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "oauthExists", null);
AuthController = __decorate([
    ApiTags('Auth'),
    Controller('/auth'),
    __metadata("design:paramtypes", [AuthService,
        EmailService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map