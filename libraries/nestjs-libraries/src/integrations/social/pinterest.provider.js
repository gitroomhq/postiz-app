import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { PinterestSettingsDto } from "../../dtos/posts/providers-settings/pinterest.dto";
import axios from 'axios';
import FormData from 'form-data';
import { timer } from "../../../../helpers/src/utils/timer";
import { SocialAbstract } from "../social.abstract";
import dayjs from 'dayjs';
import { Tool } from "../tool.decorator";
import { Rules } from "../../chat/rules.description.decorator";
let PinterestProvider = class PinterestProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'pinterest';
        this.name = 'Pinterest';
        this.isBetweenSteps = false;
        this.scopes = [
            'boards:read',
            'boards:write',
            'pins:read',
            'pins:write',
            'user_accounts:read',
        ];
        this.maxConcurrentJob = 3; // Pinterest has more lenient rate limits
        this.dto = PinterestSettingsDto;
        this.editor = 'normal';
    }
    maxLength() {
        return 500;
    }
    handleErrors(body) {
        if (body.indexOf('cover_image_url or cover_image_content_type') > -1) {
            return {
                type: 'bad-body',
                value: 'When uploading a video, you must add also an image to be used as a cover image.',
            };
        }
        return undefined;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token, expires_in } = yield (yield fetch('https://api.pinterest.com/v5/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken,
                    scope: this.scopes.join(','),
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
                }),
            })).json();
            const { id, profile_image, username } = yield (yield fetch('https://api.pinterest.com/v5/user_account', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                id: id,
                name: username,
                accessToken: access_token,
                refreshToken: refreshToken,
                expiresIn: expires_in,
                picture: profile_image || '',
                username,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: `https://www.pinterest.com/oauth/?client_id=${process.env.PINTEREST_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/pinterest`)}&response_type=code&scope=${encodeURIComponent('boards:read,boards:write,pins:read,pins:write,user_accounts:read')}&state=${state}`,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token, refresh_token, expires_in, scope } = yield (yield fetch('https://api.pinterest.com/v5/oauth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: params.code,
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/pinterest`,
                }),
            })).json();
            this.checkScopes(this.scopes, scope);
            const { id, profile_image, username } = yield (yield fetch('https://api.pinterest.com/v5/user_account', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                id: id,
                name: username,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: expires_in,
                picture: profile_image,
                username,
            };
        });
    }
    boards(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { items } = yield (yield fetch('https://api.pinterest.com/v5/boards', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return ((items === null || items === void 0 ? void 0 : items.map((item) => ({
                name: item.name,
                id: item.id,
            }))) || []);
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
            let mediaId = '';
            const findMp4 = (_b = (_a = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _a === void 0 ? void 0 : _a.media) === null || _b === void 0 ? void 0 : _b.find((p) => { var _a; return (((_a = p.path) === null || _a === void 0 ? void 0 : _a.indexOf('mp4')) || -1) > -1; });
            const picture = (_d = (_c = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _c === void 0 ? void 0 : _c.media) === null || _d === void 0 ? void 0 : _d.find((p) => { var _a; return (((_a = p.path) === null || _a === void 0 ? void 0 : _a.indexOf('mp4')) || -1) === -1; });
            if (findMp4) {
                const { upload_url, media_id, upload_parameters } = yield (yield this.fetch('https://api.pinterest.com/v5/media', {
                    method: 'POST',
                    body: JSON.stringify({
                        media_type: 'video',
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                })).json();
                const { data, status } = yield axios.get((_g = (_f = (_e = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _e === void 0 ? void 0 : _e.media) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.path, {
                    responseType: 'stream',
                });
                const formData = Object.keys(upload_parameters)
                    .filter((f) => f)
                    .reduce((acc, key) => {
                    acc.append(key, upload_parameters[key]);
                    return acc;
                }, new FormData());
                formData.append('file', data);
                yield axios.post(upload_url, formData);
                let statusCode = '';
                while (statusCode !== 'succeeded') {
                    const mediafile = yield (yield this.fetch('https://api.pinterest.com/v5/media/' + media_id, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }, '', 0, true)).json();
                    yield timer(30000);
                    statusCode = mediafile.status;
                }
                mediaId = media_id;
            }
            const mapImages = (_j = (_h = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _h === void 0 ? void 0 : _h.media) === null || _j === void 0 ? void 0 : _j.map((m) => ({
                path: m.path,
            }));
            const { id: pId } = yield (yield this.fetch('https://api.pinterest.com/v5/pins', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (((_k = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _k === void 0 ? void 0 : _k.settings.link)
                    ? { link: (_l = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _l === void 0 ? void 0 : _l.settings.link }
                    : {})), (((_m = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _m === void 0 ? void 0 : _m.settings.title)
                    ? { title: (_o = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _o === void 0 ? void 0 : _o.settings.title }
                    : {})), { description: (_p = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _p === void 0 ? void 0 : _p.message }), (((_q = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _q === void 0 ? void 0 : _q.settings.dominant_color)
                    ? { dominant_color: (_r = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _r === void 0 ? void 0 : _r.settings.dominant_color }
                    : {})), { board_id: (_s = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _s === void 0 ? void 0 : _s.settings.board, media_source: mediaId
                        ? {
                            source_type: 'video_id',
                            media_id: mediaId,
                            cover_image_url: picture === null || picture === void 0 ? void 0 : picture.path,
                        }
                        : (mapImages === null || mapImages === void 0 ? void 0 : mapImages.length) === 1
                            ? {
                                source_type: 'image_url',
                                url: (_t = mapImages === null || mapImages === void 0 ? void 0 : mapImages[0]) === null || _t === void 0 ? void 0 : _t.path,
                            }
                            : {
                                source_type: 'multiple_image_urls',
                                items: mapImages,
                            } })),
            })).json();
            return [
                {
                    id: (_u = postDetails === null || postDetails === void 0 ? void 0 : postDetails[0]) === null || _u === void 0 ? void 0 : _u.id,
                    postId: pId,
                    releaseURL: `https://www.pinterest.com/pin/${pId}`,
                    status: 'success',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const until = dayjs().format('YYYY-MM-DD');
            const since = dayjs().subtract(date, 'day').format('YYYY-MM-DD');
            const { all: { daily_metrics }, } = yield (yield fetch(`https://api.pinterest.com/v5/user_account/analytics?start_date=${since}&end_date=${until}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            })).json();
            return daily_metrics.reduce((acc, item) => {
                if (typeof item.metrics.PIN_CLICK_RATE !== 'undefined') {
                    acc[0].data.push({
                        date: item.date,
                        total: item.metrics.PIN_CLICK_RATE,
                    });
                    acc[1].data.push({
                        date: item.date,
                        total: item.metrics.IMPRESSION,
                    });
                    acc[2].data.push({
                        date: item.date,
                        total: item.metrics.PIN_CLICK,
                    });
                    acc[3].data.push({
                        date: item.date,
                        total: item.metrics.ENGAGEMENT,
                    });
                    acc[4].data.push({
                        date: item.date,
                        total: item.metrics.SAVE,
                    });
                }
                return acc;
            }, [
                { label: 'Pin click rate', data: [] },
                { label: 'Impressions', data: [] },
                { label: 'Pin Clicks', data: [] },
                { label: 'Engagement', data: [] },
                { label: 'Saves', data: [] },
            ]);
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = dayjs().format('YYYY-MM-DD');
            // Use a very long date range (2 years) to capture lifetime metrics for older posts
            const since = dayjs().subtract(2, 'year').format('YYYY-MM-DD');
            try {
                // Fetch pin analytics from Pinterest API
                const response = yield this.fetch(`https://api.pinterest.com/v5/pins/${postId}/analytics?start_date=${since}&end_date=${today}&metric_types=IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                const data = yield response.json();
                if (!data || !data.all) {
                    return [];
                }
                const result = [];
                const metrics = data.all;
                if (metrics.lifetime_metrics) {
                    const lifetimeMetrics = metrics.lifetime_metrics;
                    if (lifetimeMetrics.IMPRESSION !== undefined) {
                        result.push({
                            label: 'Impressions',
                            percentageChange: 0,
                            data: [{ total: String(lifetimeMetrics.IMPRESSION), date: today }],
                        });
                    }
                    if (lifetimeMetrics.PIN_CLICK !== undefined) {
                        result.push({
                            label: 'Pin Clicks',
                            percentageChange: 0,
                            data: [{ total: String(lifetimeMetrics.PIN_CLICK), date: today }],
                        });
                    }
                    if (lifetimeMetrics.OUTBOUND_CLICK !== undefined) {
                        result.push({
                            label: 'Outbound Clicks',
                            percentageChange: 0,
                            data: [{ total: String(lifetimeMetrics.OUTBOUND_CLICK), date: today }],
                        });
                    }
                    if (lifetimeMetrics.SAVE !== undefined) {
                        result.push({
                            label: 'Saves',
                            percentageChange: 0,
                            data: [{ total: String(lifetimeMetrics.SAVE), date: today }],
                        });
                    }
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching Pinterest post analytics:', err);
                return [];
            }
        });
    }
};
__decorate([
    Tool({ description: 'List of boards', dataSchema: [] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PinterestProvider.prototype, "boards", null);
PinterestProvider = __decorate([
    Rules('Pinterest requires at least one media, if posting a video, you must have two attachment, one for video, one for the cover picture, When posting a video, there can be only one')
], PinterestProvider);
export { PinterestProvider };
//# sourceMappingURL=pinterest.provider.js.map