import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, HttpException, Param, Post, Req } from '@nestjs/common';
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { StripeService } from "../../../../../libraries/nestjs-libraries/src/services/stripe.service";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { BillingSubscribeDto } from "../../../../../libraries/nestjs-libraries/src/dtos/billing/billing.subscribe.dto";
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { NotificationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { Nowpayments } from "../../../../../libraries/nestjs-libraries/src/crypto/nowpayments";
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
let BillingController = class BillingController {
    constructor(_subscriptionService, _stripeService, _notificationService, _nowpayments) {
        this._subscriptionService = _subscriptionService;
        this._stripeService = _stripeService;
        this._notificationService = _notificationService;
        this._nowpayments = _nowpayments;
    }
    checkId(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                status: yield this._stripeService.checkSubscription(org.id, body),
            };
        });
    }
    checkDiscount(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                offerCoupon: !(yield this._stripeService.checkDiscount(org.paymentId))
                    ? false
                    : AuthService.signJWT({ discount: true }),
            };
        });
    }
    applyDiscount(org) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._stripeService.applyDiscount(org.paymentId);
        });
    }
    finishTrial(org) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._stripeService.finishTrial(org.paymentId);
            }
            catch (err) { }
            return {
                finish: true,
            };
        });
    }
    isTrialFinished(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                finished: !org.isTrailing,
            };
        });
    }
    embedded(org, user, body, req) {
        var _a;
        const uniqueId = (_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.track;
        return this._stripeService.embedded(uniqueId, org.id, user.id, body, org.allowTrial);
    }
    subscribe(org, user, body, req) {
        var _a;
        const uniqueId = (_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.track;
        return this._stripeService.subscribe(uniqueId, org.id, user.id, body, org.allowTrial);
    }
    modifyPayment(org) {
        return __awaiter(this, void 0, void 0, function* () {
            const customer = yield this._stripeService.getCustomerByOrganizationId(org.id);
            const { url } = yield this._stripeService.createBillingPortalLink(customer);
            return {
                portal: url,
            };
        });
    }
    getCurrentBilling(org) {
        return this._subscriptionService.getSubscriptionByOrganizationId(org.id);
    }
    cancel(org, user, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._notificationService.sendEmail(process.env.EMAIL_FROM_ADDRESS, 'Subscription Cancelled', `Organization ${org.name} has cancelled their subscription because: ${body.feedback}`, user.email);
            return this._stripeService.setToCancel(org.id);
        });
    }
    prorate(org, body) {
        return this._stripeService.prorate(org.id, body);
    }
    lifetime(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._stripeService.lifetimeDeal(org.id, body.code);
        });
    }
    getCharges(user, org) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new HttpException('Unauthorized', 400);
            }
            return this._stripeService.getCharges(org.id);
        });
    }
    refundCharges(user, org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new HttpException('Unauthorized', 400);
            }
            return this._stripeService.refundCharges(org.id, body.chargeIds);
        });
    }
    cancelSubscription(user, org) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new HttpException('Unauthorized', 400);
            }
            return this._stripeService.cancelSubscription(org.id);
        });
    }
    addSubscription(body, user, org) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!user.isSuperAdmin) {
                throw new Error('Unauthorized');
            }
            yield this._subscriptionService.addSubscription(org.id, user.id, body.subscription);
        });
    }
    crypto(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._nowpayments.createPaymentPage(org.id);
        });
    }
};
__decorate([
    Get('/check/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "checkId", null);
__decorate([
    Get('/check-discount'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "checkDiscount", null);
__decorate([
    Post('/apply-discount'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "applyDiscount", null);
__decorate([
    Post('/finish-trial'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "finishTrial", null);
__decorate([
    Get('/is-trial-finished'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "isTrialFinished", null);
__decorate([
    Post('/embedded'),
    __param(0, GetOrgFromRequest()),
    __param(1, GetUserFromRequest()),
    __param(2, Body()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, BillingSubscribeDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "embedded", null);
__decorate([
    Post('/subscribe'),
    __param(0, GetOrgFromRequest()),
    __param(1, GetUserFromRequest()),
    __param(2, Body()),
    __param(3, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, BillingSubscribeDto, Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "subscribe", null);
__decorate([
    Get('/portal'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "modifyPayment", null);
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getCurrentBilling", null);
__decorate([
    Post('/cancel'),
    __param(0, GetOrgFromRequest()),
    __param(1, GetUserFromRequest()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancel", null);
__decorate([
    Post('/prorate'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BillingSubscribeDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "prorate", null);
__decorate([
    Post('/lifetime'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "lifetime", null);
__decorate([
    Get('/charges'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getCharges", null);
__decorate([
    Post('/refund-charges'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "refundCharges", null);
__decorate([
    Post('/cancel-subscription'),
    __param(0, GetUserFromRequest()),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "cancelSubscription", null);
__decorate([
    Post('/add-subscription'),
    __param(0, Body()),
    __param(1, GetUserFromRequest()),
    __param(2, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "addSubscription", null);
__decorate([
    Get('/crypto'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "crypto", null);
BillingController = __decorate([
    ApiTags('Billing'),
    Controller('/billing'),
    __metadata("design:paramtypes", [SubscriptionService,
        StripeService,
        NotificationService,
        Nowpayments])
], BillingController);
export { BillingController };
//# sourceMappingURL=billing.controller.js.map