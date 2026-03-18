import { __awaiter, __decorate, __metadata } from "tslib";
import Stripe from 'stripe';
import { Injectable } from '@nestjs/common';
import { SubscriptionService } from "../database/prisma/subscriptions/subscription.service";
import { OrganizationService } from "../database/prisma/organizations/organization.service";
import { makeId } from "./make.is";
import { groupBy } from 'lodash';
import { pricing } from "../database/prisma/subscriptions/pricing";
import { AuthService } from "../../../helpers/src/auth/auth.service";
import { TrackService } from "../track/track.service";
import { UsersService } from "../database/prisma/users/users.service";
import { TrackEnum } from "../user/track.enum";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_nothing');
let StripeService = class StripeService {
    constructor(_subscriptionService, _organizationService, _userService, _trackService) {
        this._subscriptionService = _subscriptionService;
        this._organizationService = _organizationService;
        this._userService = _userService;
        this._trackService = _trackService;
    }
    validateRequest(rawBody, signature, endpointSecret) {
        return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    }
    checkValidCard(event) {
        return __awaiter(this, void 0, void 0, function* () {
            if (event.data.object.status === 'incomplete') {
                return false;
            }
            const getOrgFromCustomer = yield this._organizationService.getOrgByCustomerId(event.data.object.customer);
            if (!(getOrgFromCustomer === null || getOrgFromCustomer === void 0 ? void 0 : getOrgFromCustomer.allowTrial)) {
                return true;
            }
            console.log('Checking card');
            const paymentMethods = yield stripe.paymentMethods.list({
                customer: event.data.object.customer,
            });
            // find the last one created
            const latestMethod = paymentMethods.data.reduce((prev, current) => {
                if (prev.created < current.created) {
                    return current;
                }
                return prev;
            }, { created: -100 });
            if (!latestMethod.id) {
                return false;
            }
            try {
                const paymentIntent = yield stripe.paymentIntents.create({
                    amount: 100,
                    currency: 'usd',
                    payment_method: latestMethod.id,
                    customer: event.data.object.customer,
                    automatic_payment_methods: {
                        allow_redirects: 'never',
                        enabled: true,
                    },
                    capture_method: 'manual', // Authorize without capturing
                    confirm: true, // Confirm the PaymentIntent
                });
                if (paymentIntent.status !== 'requires_capture') {
                    console.error('Cant charge');
                    yield stripe.paymentMethods.detach(paymentMethods.data[0].id);
                    yield stripe.subscriptions.cancel(event.data.object.id);
                    return false;
                }
                yield stripe.paymentIntents.cancel(paymentIntent.id);
                return true;
            }
            catch (err) {
                try {
                    yield stripe.paymentMethods.detach(paymentMethods.data[0].id);
                    yield stripe.subscriptions.cancel(event.data.object.id);
                }
                catch (err) {
                    /*dont do anything*/
                }
                return false;
            }
        });
    }
    createSubscription(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { uniqueId, billing, period, } = event.data.object.metadata;
            try {
                const check = yield this.checkValidCard(event);
                if (!check) {
                    return { ok: false };
                }
            }
            catch (err) {
                return { ok: false };
            }
            return this._subscriptionService.createOrUpdateSubscription(event.data.object.status !== 'active', uniqueId, event.data.object.customer, pricing[billing].channel, billing, period, event.data.object.cancel_at);
        });
    }
    updateSubscription(event) {
        return __awaiter(this, void 0, void 0, function* () {
            const { uniqueId, billing, period, } = event.data.object.metadata;
            const check = yield this.checkValidCard(event);
            if (!check) {
                return { ok: false };
            }
            return this._subscriptionService.createOrUpdateSubscription(event.data.object.status !== 'active', uniqueId, event.data.object.customer, pricing[billing].channel, billing, period, event.data.object.cancel_at);
        });
    }
    deleteSubscription(event) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._subscriptionService.deleteSubscription(event.data.object.customer);
        });
    }
    createOrGetCustomer(organization) {
        return __awaiter(this, void 0, void 0, function* () {
            if (organization.paymentId) {
                return organization.paymentId;
            }
            const users = yield this._organizationService.getTeam(organization.id);
            const customer = yield stripe.customers.create({
                email: users.users[0].user.email,
                name: organization.name,
            });
            yield this._subscriptionService.updateCustomerId(organization.id, customer.id);
            return customer.id;
        });
    }
    getPackages() {
        return __awaiter(this, void 0, void 0, function* () {
            const products = yield stripe.prices.list({
                active: true,
                expand: ['data.tiers', 'data.product'],
                lookup_keys: [
                    'standard_monthly',
                    'standard_yearly',
                    'pro_monthly',
                    'pro_yearly',
                ],
            });
            const productsList = groupBy(products.data.map((p) => {
                var _a, _b, _c, _d;
                return ({
                    name: (_a = p.product) === null || _a === void 0 ? void 0 : _a.name,
                    recurring: (_b = p === null || p === void 0 ? void 0 : p.recurring) === null || _b === void 0 ? void 0 : _b.interval,
                    price: ((_d = (_c = p === null || p === void 0 ? void 0 : p.tiers) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.unit_amount) / 100,
                });
            }), 'recurring');
            return Object.assign({}, productsList);
        });
    }
    prorate(organizationId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const org = yield this._organizationService.getOrgById(organizationId);
            const customer = yield this.createOrGetCustomer(org);
            const priceData = pricing[body.billing];
            const allProducts = yield stripe.products.list({
                active: true,
                expand: ['data.prices'],
            });
            const findProduct = allProducts.data.find((product) => product.name.toUpperCase() === body.billing.toUpperCase()) ||
                (yield stripe.products.create({
                    active: true,
                    name: body.billing,
                }));
            const pricesList = yield stripe.prices.list({
                active: true,
                product: findProduct.id,
            });
            const findPrice = pricesList.data.find((p) => {
                var _a, _b;
                return ((_b = (_a = p === null || p === void 0 ? void 0 : p.recurring) === null || _a === void 0 ? void 0 : _a.interval) === null || _b === void 0 ? void 0 : _b.toLowerCase()) ===
                    (body.period === 'MONTHLY' ? 'month' : 'year') &&
                    (p === null || p === void 0 ? void 0 : p.nickname) === body.billing + ' ' + body.period &&
                    (p === null || p === void 0 ? void 0 : p.unit_amount) ===
                        (body.period === 'MONTHLY'
                            ? priceData.month_price
                            : priceData.year_price) *
                            100;
            }) ||
                (yield stripe.prices.create({
                    active: true,
                    product: findProduct.id,
                    currency: 'usd',
                    nickname: body.billing + ' ' + body.period,
                    unit_amount: (body.period === 'MONTHLY'
                        ? priceData.month_price
                        : priceData.year_price) * 100,
                    recurring: {
                        interval: body.period === 'MONTHLY' ? 'month' : 'year',
                    },
                }));
            const proration_date = Math.floor(Date.now() / 1000);
            const currentUserSubscription = {
                data: (yield stripe.subscriptions.list({
                    customer,
                    status: 'all',
                })).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
            };
            try {
                const price = yield stripe.invoices.createPreview({
                    customer,
                    subscription: (_b = (_a = currentUserSubscription === null || currentUserSubscription === void 0 ? void 0 : currentUserSubscription.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.id,
                    subscription_details: {
                        proration_behavior: 'create_prorations',
                        billing_cycle_anchor: 'now',
                        items: [
                            {
                                id: (_g = (_f = (_e = (_d = (_c = currentUserSubscription === null || currentUserSubscription === void 0 ? void 0 : currentUserSubscription.data) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.items) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.id,
                                price: findPrice === null || findPrice === void 0 ? void 0 : findPrice.id,
                                quantity: 1,
                            },
                        ],
                        proration_date: proration_date,
                    },
                });
                return {
                    price: (price === null || price === void 0 ? void 0 : price.amount_remaining) ? (price === null || price === void 0 ? void 0 : price.amount_remaining) / 100 : 0,
                };
            }
            catch (err) {
                return { price: 0 };
            }
        });
    }
    getCustomerSubscriptions(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const org = (yield this._organizationService.getOrgById(organizationId));
            const customer = org.paymentId;
            return stripe.subscriptions.list({
                customer: customer,
                status: 'all',
            });
        });
    }
    setToCancel(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = makeId(10);
            const org = yield this._organizationService.getOrgById(organizationId);
            const customer = yield this.createOrGetCustomer(org);
            const currentUserSubscription = {
                data: (yield stripe.subscriptions.list({
                    customer,
                    status: 'all',
                    expand: ['data.latest_invoice'],
                })).data.filter((f) => f.status !== 'canceled'),
            };
            const sub = currentUserSubscription.data[0];
            // If the user is toggling back (un-cancelling), just remove the cancel
            if (sub.cancel_at_period_end) {
                const { cancel_at } = yield stripe.subscriptions.update(sub.id, {
                    cancel_at_period_end: false,
                    metadata: { service: 'gitroom', id },
                });
                return {
                    id,
                    cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
                };
            }
            // Check if the latest invoice has a failed payment
            const latestInvoice = sub.latest_invoice;
            const hasFailedPayment = sub.status === 'past_due' ||
                (latestInvoice === null || latestInvoice === void 0 ? void 0 : latestInvoice.status) === 'open' ||
                (latestInvoice === null || latestInvoice === void 0 ? void 0 : latestInvoice.status) === 'uncollectible';
            if (hasFailedPayment) {
                // Payment already failed — cancel immediately and delete subscription
                yield stripe.subscriptions.cancel(sub.id);
                yield this._subscriptionService.deleteSubscription(customer);
                return {
                    id,
                    cancel_at: new Date(),
                };
            }
            // Payment succeeded — cancel at end of billing period
            const { cancel_at } = yield stripe.subscriptions.update(sub.id, {
                cancel_at_period_end: true,
                metadata: { service: 'gitroom', id },
            });
            return {
                id,
                cancel_at: cancel_at ? new Date(cancel_at * 1000) : undefined,
            };
        });
    }
    getCustomerByOrganizationId(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const org = (yield this._organizationService.getOrgById(organizationId));
            return org.paymentId;
        });
    }
    createBillingPortalLink(customer) {
        return __awaiter(this, void 0, void 0, function* () {
            return stripe.billingPortal.sessions.create({
                customer,
                return_url: process.env['FRONTEND_URL'] + '/billing',
            });
        });
    }
    /**
     * Find an active promotion code with autoapply: true metadata
     * Only returns codes that are active and not expired
     * Returns the promotion code string (not the ID) for frontend auto-apply
     */
    findAutoApplyPromotionCode() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const promotionCodes = yield stripe.promotionCodes.list({
                    active: true,
                    limit: 100,
                });
                const now = Math.floor(Date.now() / 1000);
                for (const promoCode of promotionCodes.data) {
                    const coupon = typeof promoCode.promotion.coupon === 'string'
                        ? null
                        : promoCode.promotion.coupon;
                    // Check if it has autoapply metadata set to true (check both promo and coupon metadata)
                    const autoApply = (_a = Object.assign({}, promoCode.metadata, coupon === null || coupon === void 0 ? void 0 : coupon.metadata)) === null || _a === void 0 ? void 0 : _a.autoapply;
                    if (autoApply !== 'true')
                        continue;
                    // Check if the promotion code has expired
                    if (promoCode.expires_at && promoCode.expires_at < now)
                        continue;
                    // Check if the coupon has expired (redeem_by)
                    if ((coupon === null || coupon === void 0 ? void 0 : coupon.redeem_by) && coupon.redeem_by < now)
                        continue;
                    // Check if max redemptions reached
                    if (promoCode.max_redemptions &&
                        promoCode.times_redeemed >= promoCode.max_redemptions)
                        continue;
                    // Found a valid auto-apply promotion code - return the code string for frontend
                    return promoCode.code;
                }
                return null;
            }
            catch (err) {
                console.error('Error finding auto-apply promotion code:', err);
                return null;
            }
        });
    }
    createEmbeddedCheckout(ud, uniqueId, customer, body, price, userId, allowTrial) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._userService.getUserById(userId);
            try {
                yield stripe.customers.update(customer, Object.assign({ email: user.email }, (body.dub
                    ? {
                        metadata: {
                            dubCustomerExternalId: userId,
                            dubClickId: body.dub,
                        },
                    }
                    : {})));
            }
            catch (err) { }
            // Check for auto-apply promotion code (only for monthly plans)
            let autoApplyPromoCode = null;
            if (body.period === 'MONTHLY') {
                autoApplyPromoCode = yield this.findAutoApplyPromotionCode();
            }
            const isUtm = body.utm ? `&utm_source=${body.utm}` : '';
            const { client_secret } = yield stripe.checkout.sessions.create(Object.assign(Object.assign({ ui_mode: 'custom', customer, return_url: process.env['FRONTEND_URL'] +
                    `/launches?onboarding=true&check=${uniqueId}${isUtm}`, mode: 'subscription', subscription_data: Object.assign(Object.assign({}, (allowTrial ? { trial_period_days: 7 } : {})), { metadata: Object.assign(Object.assign({ service: 'gitroom' }, body), { userId,
                        uniqueId,
                        ud }) }) }, (body.datafast_session_id && body.datafast_visitor_id
                ? {
                    metadata: {
                        datafast_visitor_id: body.datafast_visitor_id,
                        datafast_session_id: body.datafast_session_id,
                    },
                }
                : {})), { allow_promotion_codes: body.period === 'MONTHLY', line_items: [
                    {
                        price,
                        quantity: 1,
                    },
                ] }));
            // Return auto-apply promo code for frontend to apply
            return Object.assign({ client_secret }, (autoApplyPromoCode ? { auto_apply_coupon: autoApplyPromoCode } : {}));
        });
    }
    createCheckoutSession(ud, uniqueId, customer, body, price, userId, allowTrial) {
        return __awaiter(this, void 0, void 0, function* () {
            const isUtm = body.utm ? `&utm_source=${body.utm}` : '';
            if (body.dub) {
                yield stripe.customers.update(customer, {
                    metadata: {
                        dubCustomerExternalId: userId,
                        dubClickId: body.dub,
                    },
                });
            }
            const { url } = yield stripe.checkout.sessions.create({
                customer,
                cancel_url: process.env['FRONTEND_URL'] + `/billing?cancel=true${isUtm}`,
                success_url: process.env['FRONTEND_URL'] +
                    `/launches?onboarding=true&check=${uniqueId}${isUtm}`,
                mode: 'subscription',
                subscription_data: Object.assign(Object.assign({}, (allowTrial ? { trial_period_days: 7 } : {})), { metadata: Object.assign(Object.assign({ service: 'gitroom' }, body), { userId,
                        uniqueId,
                        ud }) }),
                allow_promotion_codes: body.period === 'MONTHLY',
                line_items: [
                    {
                        price,
                        quantity: 1,
                    },
                ],
            });
            return { url };
        });
    }
    finishTrial(paymentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const list = (yield stripe.subscriptions.list({
                customer: paymentId,
            })).data.filter((f) => f.status === 'trialing');
            return stripe.subscriptions.update(list[0].id, {
                trial_end: 'now',
            });
        });
    }
    checkDiscount(customer) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (!process.env.STRIPE_DISCOUNT_ID) {
                return false;
            }
            const list = yield stripe.charges.list({
                customer,
                limit: 1,
            });
            if (!list.data.filter((f) => f.amount > 1000).length) {
                return false;
            }
            const currentUserSubscription = {
                data: (yield stripe.subscriptions.list({
                    customer,
                    status: 'all',
                    expand: ['data.discounts'],
                })).data.find((f) => f.status === 'active' || f.status === 'trialing'),
            };
            if (!currentUserSubscription) {
                return false;
            }
            if (((_c = (_b = (_a = currentUserSubscription.data) === null || _a === void 0 ? void 0 : _a.items.data[0]) === null || _b === void 0 ? void 0 : _b.price.recurring) === null || _c === void 0 ? void 0 : _c.interval) ===
                'year' ||
                ((_d = currentUserSubscription.data) === null || _d === void 0 ? void 0 : _d.discounts.length)) {
                return false;
            }
            return true;
        });
    }
    applyDiscount(customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const check = this.checkDiscount(customer);
            if (!check) {
                return false;
            }
            const currentUserSubscription = {
                data: (yield stripe.subscriptions.list({
                    customer,
                    status: 'all',
                    expand: ['data.discounts'],
                })).data.find((f) => f.status === 'active' || f.status === 'trialing'),
            };
            yield stripe.subscriptions.update(currentUserSubscription.data.id, {
                discounts: [
                    {
                        coupon: process.env.STRIPE_DISCOUNT_ID,
                    },
                ],
            });
            return true;
        });
    }
    checkSubscription(organizationId, subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const orgValue = yield this._subscriptionService.checkSubscription(organizationId, subscriptionId);
            if (orgValue) {
                return 2;
            }
            const getCustomerSubscriptions = yield this.getCustomerSubscriptions(organizationId);
            if (getCustomerSubscriptions.data.length === 0) {
                return 0;
            }
            if ((_a = getCustomerSubscriptions.data.find((p) => p.metadata.uniqueId === subscriptionId)) === null || _a === void 0 ? void 0 : _a.canceled_at) {
                return 1;
            }
            return 0;
        });
    }
    embedded(uniqueId, organizationId, userId, body, allowTrial) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = makeId(10);
            const priceData = pricing[body.billing];
            const org = yield this._organizationService.getOrgById(organizationId);
            const customer = yield this.createOrGetCustomer(org);
            const allProducts = yield stripe.products.list({
                active: true,
                expand: ['data.prices'],
            });
            const findProduct = allProducts.data.find((product) => product.name.toUpperCase() === body.billing.toUpperCase()) ||
                (yield stripe.products.create({
                    active: true,
                    name: body.billing,
                }));
            const pricesList = yield stripe.prices.list({
                active: true,
                product: findProduct.id,
            });
            const findPrice = pricesList.data.find((p) => {
                var _a, _b;
                return ((_b = (_a = p === null || p === void 0 ? void 0 : p.recurring) === null || _a === void 0 ? void 0 : _a.interval) === null || _b === void 0 ? void 0 : _b.toLowerCase()) ===
                    (body.period === 'MONTHLY' ? 'month' : 'year') &&
                    (p === null || p === void 0 ? void 0 : p.unit_amount) ===
                        (body.period === 'MONTHLY'
                            ? priceData.month_price
                            : priceData.year_price) *
                            100;
            }) ||
                (yield stripe.prices.create({
                    active: true,
                    product: findProduct.id,
                    currency: 'usd',
                    nickname: body.billing + ' ' + body.period,
                    unit_amount: (body.period === 'MONTHLY'
                        ? priceData.month_price
                        : priceData.year_price) * 100,
                    recurring: {
                        interval: body.period === 'MONTHLY' ? 'month' : 'year',
                    },
                }));
            return this.createEmbeddedCheckout(uniqueId, id, customer, body, findPrice.id, userId, allowTrial);
        });
    }
    subscribe(uniqueId, organizationId, userId, body, allowTrial) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = makeId(10);
            const priceData = pricing[body.billing];
            const org = yield this._organizationService.getOrgById(organizationId);
            const customer = yield this.createOrGetCustomer(org);
            const allProducts = yield stripe.products.list({
                active: true,
                expand: ['data.prices'],
            });
            const findProduct = allProducts.data.find((product) => product.name.toUpperCase() === body.billing.toUpperCase()) ||
                (yield stripe.products.create({
                    active: true,
                    name: body.billing,
                }));
            const pricesList = yield stripe.prices.list({
                active: true,
                product: findProduct.id,
            });
            const findPrice = pricesList.data.find((p) => {
                var _a, _b;
                return ((_b = (_a = p === null || p === void 0 ? void 0 : p.recurring) === null || _a === void 0 ? void 0 : _a.interval) === null || _b === void 0 ? void 0 : _b.toLowerCase()) ===
                    (body.period === 'MONTHLY' ? 'month' : 'year') &&
                    (p === null || p === void 0 ? void 0 : p.unit_amount) ===
                        (body.period === 'MONTHLY'
                            ? priceData.month_price
                            : priceData.year_price) *
                            100;
            }) ||
                (yield stripe.prices.create({
                    active: true,
                    product: findProduct.id,
                    currency: 'usd',
                    nickname: body.billing + ' ' + body.period,
                    unit_amount: (body.period === 'MONTHLY'
                        ? priceData.month_price
                        : priceData.year_price) * 100,
                    recurring: {
                        interval: body.period === 'MONTHLY' ? 'month' : 'year',
                    },
                }));
            const getCurrentSubscriptions = yield this._subscriptionService.getSubscription(organizationId);
            if (!getCurrentSubscriptions) {
                return this.createCheckoutSession(uniqueId, id, customer, body, findPrice.id, userId, allowTrial);
            }
            const currentUserSubscription = {
                data: (yield stripe.subscriptions.list({
                    customer,
                    status: 'all',
                })).data.filter((f) => f.status === 'active' || f.status === 'trialing'),
            };
            try {
                yield stripe.subscriptions.update(currentUserSubscription.data[0].id, {
                    cancel_at_period_end: false,
                    metadata: Object.assign(Object.assign({ service: 'gitroom' }, body), { userId,
                        id, ud: uniqueId }),
                    proration_behavior: 'always_invoice',
                    items: [
                        {
                            id: currentUserSubscription.data[0].items.data[0].id,
                            price: findPrice.id,
                            quantity: 1,
                        },
                    ],
                });
                return { id };
            }
            catch (err) {
                const { url } = yield this.createBillingPortalLink(customer);
                return {
                    portal: url,
                };
            }
        });
    }
    paymentSucceeded(event) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // get subscription from payment
            const subscriptionId = (_b = (_a = event.data.object.parent) === null || _a === void 0 ? void 0 : _a.subscription_details) === null || _b === void 0 ? void 0 : _b.subscription;
            if (!subscriptionId) {
                return { ok: true };
            }
            const subscription = yield stripe.subscriptions.retrieve(typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id);
            const { userId, ud } = subscription.metadata;
            const user = yield this._userService.getUserById(userId);
            if (user && user.ip && user.agent) {
                this._trackService.track(ud, user.ip, user.agent, TrackEnum.Purchase, {
                    value: event.data.object.amount_paid / 100,
                });
            }
            return { ok: true };
        });
    }
    getCharges(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const org = yield this._organizationService.getOrgById(organizationId);
            if (!(org === null || org === void 0 ? void 0 : org.paymentId)) {
                return [];
            }
            const charges = yield stripe.charges.list({
                customer: org.paymentId,
                limit: 100,
            });
            return charges.data
                .filter((f) => f.status === 'succeeded')
                .map((charge) => ({
                id: charge.id,
                amount: charge.amount,
                currency: charge.currency,
                created: charge.created,
                status: charge.status,
                refunded: charge.refunded,
                amount_refunded: charge.amount_refunded,
                description: charge.description,
            }));
        });
    }
    refundCharges(organizationId, chargeIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const org = yield this._organizationService.getOrgById(organizationId);
            if (!(org === null || org === void 0 ? void 0 : org.paymentId)) {
                throw new Error('No payment customer found for this organization');
            }
            const refunded = [];
            const failed = [];
            for (const chargeId of chargeIds) {
                try {
                    yield stripe.refunds.create({ charge: chargeId });
                    refunded.push(chargeId);
                }
                catch (err) {
                    failed.push(chargeId);
                }
            }
            return { refunded, failed };
        });
    }
    cancelSubscription(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            const org = yield this._organizationService.getOrgById(organizationId);
            if (!(org === null || org === void 0 ? void 0 : org.paymentId)) {
                throw new Error('No payment customer found for this organization');
            }
            const customer = org.paymentId;
            const subscriptions = (yield stripe.subscriptions.list({
                customer,
                status: 'all',
            })).data.filter((f) => f.status !== 'canceled');
            if (!subscriptions.length) {
                throw new Error('No active subscription found');
            }
            yield stripe.subscriptions.cancel(subscriptions[0].id);
            yield this._subscriptionService.deleteSubscription(customer);
            return { cancelled: true };
        });
    }
    lifetimeDeal(organizationId, code) {
        return __awaiter(this, void 0, void 0, function* () {
            const getCurrentSubscription = yield this._subscriptionService.getSubscriptionByOrganizationId(organizationId);
            if (getCurrentSubscription && !(getCurrentSubscription === null || getCurrentSubscription === void 0 ? void 0 : getCurrentSubscription.isLifetime)) {
                throw new Error('You already have a non lifetime subscription');
            }
            try {
                const testCode = AuthService.fixedDecryption(code);
                const findCode = yield this._subscriptionService.getCode(testCode);
                if (findCode) {
                    return {
                        success: false,
                    };
                }
                const nextPackage = !getCurrentSubscription ? 'STANDARD' : 'PRO';
                const findPricing = pricing[nextPackage];
                yield this._subscriptionService.createOrUpdateSubscription(false, makeId(10), organizationId, (getCurrentSubscription === null || getCurrentSubscription === void 0 ? void 0 : getCurrentSubscription.subscriptionTier) === 'PRO'
                    ? getCurrentSubscription.totalChannels + 5
                    : findPricing.channel, nextPackage, 'MONTHLY', null, testCode, organizationId);
                return {
                    success: true,
                };
            }
            catch (err) {
                console.log(err);
                return {
                    success: false,
                };
            }
        });
    }
};
StripeService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SubscriptionService,
        OrganizationService,
        UsersService,
        TrackService])
], StripeService);
export { StripeService };
//# sourceMappingURL=stripe.service.js.map