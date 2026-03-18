import { __decorate, __metadata, __param } from "tslib";
import { Controller, HttpException, Post, Req, } from '@nestjs/common';
import { StripeService } from "../../../../../libraries/nestjs-libraries/src/services/stripe.service";
import { ApiTags } from '@nestjs/swagger';
let StripeController = class StripeController {
    constructor(_stripeService) {
        this._stripeService = _stripeService;
    }
    stripe(req) {
        var _a, _b, _c;
        const event = this._stripeService.validateRequest(req.rawBody, 
        // @ts-ignore
        req.headers['stripe-signature'], process.env.STRIPE_SIGNING_KEY);
        // Maybe it comes from another stripe webhook
        if (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ((_c = (_b = (_a = event === null || event === void 0 ? void 0 : event.data) === null || _a === void 0 ? void 0 : _a.object) === null || _b === void 0 ? void 0 : _b.metadata) === null || _c === void 0 ? void 0 : _c.service) !== 'gitroom' &&
            event.type !== 'invoice.payment_succeeded') {
            return { ok: true };
        }
        try {
            switch (event.type) {
                case 'invoice.payment_succeeded':
                    return this._stripeService.paymentSucceeded(event);
                case 'customer.subscription.created':
                    return this._stripeService.createSubscription(event);
                case 'customer.subscription.updated':
                    return this._stripeService.updateSubscription(event);
                case 'customer.subscription.deleted':
                    return this._stripeService.deleteSubscription(event);
                default:
                    return { ok: true };
            }
        }
        catch (e) {
            throw new HttpException(e, 500);
        }
    }
};
__decorate([
    Post('/'),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StripeController.prototype, "stripe", null);
StripeController = __decorate([
    ApiTags('Stripe'),
    Controller('/stripe'),
    __metadata("design:paramtypes", [StripeService])
], StripeController);
export { StripeController };
//# sourceMappingURL=stripe.controller.js.map