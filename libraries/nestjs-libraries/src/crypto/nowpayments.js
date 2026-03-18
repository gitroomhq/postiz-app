import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { makeId } from "../services/make.is";
import { AuthService } from "../../../helpers/src/auth/auth.service";
import { SubscriptionService } from "../database/prisma/subscriptions/subscription.service";
let Nowpayments = class Nowpayments {
    constructor(_subscriptionService) {
        this._subscriptionService = _subscriptionService;
    }
    processPayment(path, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const decrypt = AuthService.verifyJWT(path);
            if (!decrypt || !decrypt.order_id) {
                return;
            }
            if (body.payment_status !== 'confirmed' &&
                body.payment_status !== 'finished') {
                return;
            }
            const [org, make] = body.order_id.split('_');
            yield this._subscriptionService.lifeTime(org, make, 'PRO');
            return body;
        });
    }
    createPaymentPage(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const onlyId = makeId(5);
            const make = orgId + '_' + onlyId;
            const signRequest = AuthService.signJWT({ order_id: make });
            const { id, invoice_url } = yield (yield fetch('https://api.nowpayments.io/v1/invoice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.NOWPAYMENTS_API_KEY,
                },
                body: JSON.stringify({
                    price_amount: process.env.NOWPAYMENTS_AMOUNT,
                    price_currency: 'USD',
                    order_id: make,
                    pay_currency: 'SOL',
                    order_description: 'Lifetime deal account for Postiz',
                    ipn_callback_url: process.env.NEXT_PUBLIC_BACKEND_URL +
                        `/public/crypto/${signRequest}`,
                    success_url: process.env.FRONTEND_URL + `/launches?check=${onlyId}`,
                    cancel_url: process.env.FRONTEND_URL,
                }),
            })).json();
            return {
                id,
                invoice_url,
            };
        });
    }
};
Nowpayments = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SubscriptionService])
], Nowpayments);
export { Nowpayments };
//# sourceMappingURL=nowpayments.js.map