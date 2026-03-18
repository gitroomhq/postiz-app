import { __awaiter, __decorate, __metadata, __param, __rest } from "tslib";
import { Body, Controller, Get, Param, Post, Query, Req, Res, } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AgenciesService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/agencies/agencies.service";
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { TrackService } from "../../../../../libraries/nestjs-libraries/src/track/track.service";
import { RealIP } from 'nestjs-real-ip';
import { UserAgent } from "../../../../../libraries/nestjs-libraries/src/user/user.agent";
import { makeId } from "../../../../../libraries/nestjs-libraries/src/services/make.is";
import { getCookieUrlFromDomain } from "../../../../../libraries/helpers/src/subdomain/subdomain.management";
import { AgentGraphInsertService } from "../../../../../libraries/nestjs-libraries/src/agent/agent.graph.insert.service";
import { Nowpayments } from "../../../../../libraries/nestjs-libraries/src/crypto/nowpayments";
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { pricing } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
const pump = promisify(pipeline);
let PublicController = class PublicController {
    constructor(_agenciesService, _trackService, _agentGraphInsertService, _postsService, _nowpayments, _subscriptionService) {
        this._agenciesService = _agenciesService;
        this._trackService = _trackService;
        this._agentGraphInsertService = _agentGraphInsertService;
        this._postsService = _postsService;
        this._nowpayments = _nowpayments;
        this._subscriptionService = _subscriptionService;
    }
    createAgent(body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!body.apiKey ||
                !process.env.AGENT_API_KEY ||
                body.apiKey !== process.env.AGENT_API_KEY) {
                return;
            }
            return this._agentGraphInsertService.newPost(body.text);
        });
    }
    getAgencyByUser() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._agenciesService.getAllAgencies();
        });
    }
    getAgencySlug() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._agenciesService.getAllAgenciesSlug();
        });
    }
    getAgencyInformation(agency) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._agenciesService.getAgencyInformation(agency);
        });
    }
    getAgenciesCount() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._agenciesService.getCount();
        });
    }
    getPreview(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this._postsService.getPostsRecursively(id, true)).map((_a) => {
                var { childrenPost } = _a, p = __rest(_a, ["childrenPost"]);
                return (Object.assign(Object.assign({}, p), (p.integration
                    ? {
                        integration: {
                            id: p.integration.id,
                            name: p.integration.name,
                            picture: p.integration.picture,
                            providerIdentifier: p.integration.providerIdentifier,
                            profile: p.integration.profile,
                        },
                    }
                    : {})));
            });
        });
    }
    getComments(postId) {
        return __awaiter(this, void 0, void 0, function* () {
            return { comments: yield this._postsService.getComments(postId) };
        });
    }
    trackEvent(res, req, ip, userAgent, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const uniqueId = ((_a = req === null || req === void 0 ? void 0 : req.cookies) === null || _a === void 0 ? void 0 : _a.track) || makeId(10);
            const fbclid = ((_b = req === null || req === void 0 ? void 0 : req.cookies) === null || _b === void 0 ? void 0 : _b.fbclid) || body.fbclid;
            yield this._trackService.track(uniqueId, ip, userAgent, body.tt, body.additional, fbclid);
            if (!req.cookies.track) {
                res.cookie('track', uniqueId, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                    }
                    : {})), { sameSite: 'none', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            }
            if (body.fbclid && !req.cookies.fbclid) {
                res.cookie('fbclid', body.fbclid, Object.assign(Object.assign({ domain: getCookieUrlFromDomain(process.env.FRONTEND_URL) }, (!process.env.NOT_SECURED
                    ? {
                        secure: true,
                        httpOnly: true,
                    }
                    : {})), { sameSite: 'none', expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365) }));
            }
            res.status(200).json({
                track: uniqueId,
            });
        });
    }
    modifySubscription(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const load = AuthService.verifyJWT(params);
                if (!load || !load.orgId || !load.billing || !pricing[load.billing]) {
                    return { success: false };
                }
                const totalChannels = pricing[load.billing].channel || 0;
                yield this._subscriptionService.modifySubscriptionByOrg(load.orgId, totalChannels, load.billing);
                return { success: true };
            }
            catch (err) {
                return { success: false };
            }
        });
    }
    cryptoPost(body, path) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('cryptoPost', body, path);
            return this._nowpayments.processPayment(path, body);
        });
    }
    streamFile(url, res, req) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!url.endsWith('mp4')) {
                return res.status(400).send('Invalid video URL');
            }
            const ac = new AbortController();
            const onClose = () => ac.abort();
            req.on('aborted', onClose);
            res.on('close', onClose);
            const r = yield fetch(url, { signal: ac.signal });
            if (!r.ok && r.status !== 206) {
                res.status(r.status);
                throw new Error(`Upstream error: ${r.statusText}`);
            }
            const type = (_a = r.headers.get('content-type')) !== null && _a !== void 0 ? _a : 'application/octet-stream';
            res.setHeader('Content-Type', type);
            const contentRange = r.headers.get('content-range');
            if (contentRange)
                res.setHeader('Content-Range', contentRange);
            const len = r.headers.get('content-length');
            if (len)
                res.setHeader('Content-Length', len);
            const acceptRanges = (_b = r.headers.get('accept-ranges')) !== null && _b !== void 0 ? _b : 'bytes';
            res.setHeader('Accept-Ranges', acceptRanges);
            if (r.status === 206)
                res.status(206); // Partial Content for range responses
            try {
                yield pump(Readable.fromWeb(r.body), res);
            }
            catch (err) {
            }
        });
    }
};
__decorate([
    Post('/agent'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "createAgent", null);
__decorate([
    Get('/agencies-list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getAgencyByUser", null);
__decorate([
    Get('/agencies-list-slug'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getAgencySlug", null);
__decorate([
    Get('/agencies-information/:agency'),
    __param(0, Param('agency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getAgencyInformation", null);
__decorate([
    Get('/agencies-list-count'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getAgenciesCount", null);
__decorate([
    Get(`/posts/:id`),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getPreview", null);
__decorate([
    Get(`/posts/:id/comments`),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "getComments", null);
__decorate([
    Post('/t'),
    __param(0, Res()),
    __param(1, Req()),
    __param(2, RealIP()),
    __param(3, UserAgent()),
    __param(4, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "trackEvent", null);
__decorate([
    Post('/modify-subscription'),
    __param(0, Body('params')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "modifySubscription", null);
__decorate([
    Post('/crypto/:path'),
    __param(0, Body()),
    __param(1, Param('path')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "cryptoPost", null);
__decorate([
    Get('/stream'),
    __param(0, Query('url')),
    __param(1, Res()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "streamFile", null);
PublicController = __decorate([
    ApiTags('Public'),
    Controller('/public'),
    __metadata("design:paramtypes", [AgenciesService,
        TrackService,
        AgentGraphInsertService,
        PostsService,
        Nowpayments,
        SubscriptionService])
], PublicController);
export { PublicController };
//# sourceMappingURL=public.controller.js.map