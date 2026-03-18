import { __awaiter, __decorate, __rest } from "tslib";
import dayjs from 'dayjs';
import { BadBody, SocialAbstract, } from "../social.abstract";
import { TikTokDto } from "../../dtos/posts/providers-settings/tiktok.dto";
import { timer } from "../../../../helpers/src/utils/timer";
import { Rules } from "../../chat/rules.description.decorator";
let TiktokProvider = class TiktokProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'tiktok';
        this.name = 'Tiktok';
        this.isBetweenSteps = false;
        this.convertToJPEG = true;
        this.scopes = [
            'video.list',
            'user.info.basic',
            'video.publish',
            'video.upload',
            'user.info.profile',
            'user.info.stats',
        ];
        this.maxConcurrentJob = 300;
        this.dto = TikTokDto;
        this.editor = 'normal';
    }
    maxLength() {
        return 2000;
    }
    handleErrors(body) {
        // Authentication/Authorization errors - require re-authentication
        if (body.indexOf('access_token_invalid') > -1) {
            return {
                type: 'refresh-token',
                value: 'Access token invalid, please re-authenticate your TikTok account',
            };
        }
        if (body.indexOf('scope_not_authorized') > -1) {
            return {
                type: 'bad-body',
                value: 'Missing required permissions, please re-authenticate with all scopes',
            };
        }
        if (body.indexOf('scope_permission_missed') > -1) {
            return {
                type: 'bad-body',
                value: 'Additional permissions required, please re-authenticate',
            };
        }
        // Rate limiting errors
        if (body.indexOf('rate_limit_exceeded') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok API rate limit exceeded, please try again later',
            };
        }
        if (body.indexOf('file_format_check_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'File format is invalid, please check video specifications',
            };
        }
        if (body.indexOf('app_version_check_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'In order to use the TikTok upload feature, you have to update your app to the latest version',
            };
        }
        if (body.indexOf('duration_check_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'Video duration is invalid, please check video specifications',
            };
        }
        if (body.indexOf('frame_rate_check_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'Video frame rate is invalid, please check video specifications',
            };
        }
        if (body.indexOf('video_pull_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'Failed to pull video from URL, please check the URL',
            };
        }
        if (body.indexOf('photo_pull_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'Failed to pull photo from URL, please check the URL',
            };
        }
        if (body.indexOf('spam_risk_user_banned_from_posting') > -1) {
            return {
                type: 'bad-body',
                value: 'Account banned from posting, please check TikTok account status',
            };
        }
        if (body.indexOf('spam_risk_text') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok detected potential spam in the post text',
            };
        }
        if (body.indexOf('spam_risk_too_many_posts') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok says your daily post limit reached, please try again tomorrow',
            };
        }
        if (body.indexOf('spam_risk_too_many_pending_share') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok limit the maximum of pending posts to 5, please check your TikTok inbox at your TikTok mobile app',
            };
        }
        if (body.indexOf('spam_risk_user_banned_from_posting') > -1) {
            return {
                type: 'bad-body',
                value: 'Account banned from posting, please check TikTok account status',
            };
        }
        if (body.indexOf('spam_risk') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok detected potential spam',
            };
        }
        if (body.indexOf('reached_active_user_cap') > -1) {
            return {
                type: 'bad-body',
                value: 'Daily active user quota reached, please try again later',
            };
        }
        if (body.indexOf('unaudited_client_can_only_post_to_private_accounts') > -1) {
            return {
                type: 'bad-body',
                value: 'App not approved for public posting, contact support',
            };
        }
        if (body.indexOf('url_ownership_unverified') > -1) {
            return {
                type: 'bad-body',
                value: 'URL ownership not verified, please verify domain ownership',
            };
        }
        if (body.indexOf('privacy_level_option_mismatch') > -1) {
            return {
                type: 'bad-body',
                value: 'Privacy level mismatch, please check privacy settings',
            };
        }
        // Content/Format validation errors
        if (body.indexOf('invalid_file_upload') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid file format or specifications not met',
            };
        }
        if (body.indexOf('invalid_params') > -1) {
            return {
                type: 'bad-body',
                value: 'Invalid request parameters, please check content format',
            };
        }
        // Server errors
        if (body.indexOf('internal') > -1) {
            return {
                type: 'bad-body',
                value: 'There is a problem with TikTok servers, please try again later',
            };
        }
        // Generic TikTok API errors
        if (body.indexOf('picture_size_check_failed') > -1) {
            return {
                type: 'bad-body',
                value: 'Video must be at least 720p, Picture must no exceed 1080p',
            };
        }
        if (body.indexOf('TikTok API error') > -1) {
            return {
                type: 'bad-body',
                value: 'TikTok API error, please try again',
            };
        }
        // Fall back to parent class error handling
        return undefined;
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const value = {
                client_key: process.env.TIKTOK_CLIENT_ID,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            };
            const _a = yield (yield fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                method: 'POST',
                body: new URLSearchParams(value).toString(),
            })).json(), { access_token, refresh_token } = _a, all = __rest(_a, ["access_token", "refresh_token"]);
            const { data: { user: { avatar_url, display_name, open_id, username }, }, } = yield (yield fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                refreshToken: refresh_token,
                expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
                accessToken: access_token,
                id: open_id.replace(/-/g, ''),
                name: display_name,
                picture: avatar_url || '',
                username: username,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const state = Math.random().toString(36).substring(2);
            return {
                url: 'https://www.tiktok.com/v2/auth/authorize/' +
                    `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
                    `&redirect_uri=${encodeURIComponent(`${((_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.FRONTEND_URL) === null || _b === void 0 ? void 0 : _b.indexOf('https')) === -1
                        ? 'https://redirectmeto.com/'
                        : ''}${(_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.FRONTEND_URL}/integrations/social/tiktok`)}` +
                    `&state=${state}` +
                    `&response_type=code` +
                    `&scope=${encodeURIComponent(this.scopes.join(','))}`,
                codeVerifier: state,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const value = {
                client_key: process.env.TIKTOK_CLIENT_ID,
                client_secret: process.env.TIKTOK_CLIENT_SECRET,
                code: params.code,
                grant_type: 'authorization_code',
                code_verifier: params.codeVerifier,
                redirect_uri: `${((_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.FRONTEND_URL) === null || _b === void 0 ? void 0 : _b.indexOf('https')) === -1
                    ? 'https://redirectmeto.com/'
                    : ''}${(_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.FRONTEND_URL}/integrations/social/tiktok`,
            };
            const { access_token, refresh_token, scope } = yield (yield fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                method: 'POST',
                body: new URLSearchParams(value).toString(),
            })).json();
            this.checkScopes(this.scopes, scope);
            const { data: { user: { avatar_url, display_name, open_id, username }, }, } = yield (yield fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,avatar_url,display_name,union_id,username', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })).json();
            return {
                id: open_id.replace(/-/g, ''),
                name: display_name,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresIn: dayjs().add(23, 'hours').unix() - dayjs().unix(),
                picture: avatar_url,
                username: username,
            };
        });
    }
    maxVideoLength(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { max_video_post_duration_sec }, } = yield (yield fetch('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                maxDurationSeconds: max_video_post_duration_sec,
            };
        });
    }
    uploadedVideoSuccess(id, publishId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const post = yield (yield this.fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        publish_id: publishId,
                    }),
                }, '', 0, true)).json();
                const { status, publicaly_available_post_id } = post.data;
                if (status === 'SEND_TO_USER_INBOX') {
                    return {
                        url: 'https://www.tiktok.com/messages?lang=en',
                        id: 'missing',
                    };
                }
                if (status === 'PUBLISH_COMPLETE') {
                    return {
                        url: !publicaly_available_post_id
                            ? `https://www.tiktok.com/@${id}`
                            : `https://www.tiktok.com/@${id}/video/` +
                                publicaly_available_post_id,
                        id: !publicaly_available_post_id
                            ? publishId
                            : publicaly_available_post_id === null || publicaly_available_post_id === void 0 ? void 0 : publicaly_available_post_id[0],
                    };
                }
                if (status === 'FAILED') {
                    const handleError = this.handleErrors(JSON.stringify(post));
                    throw new BadBody('titok-error-upload', JSON.stringify(post), Buffer.from(JSON.stringify(post)), (handleError === null || handleError === void 0 ? void 0 : handleError.value) || '');
                }
                yield timer(10000);
            }
        });
    }
    postingMethod(method, isPhoto) {
        switch (method) {
            case 'UPLOAD':
                return isPhoto ? '/content/init/' : '/inbox/video/init/';
            case 'DIRECT_POST':
            default:
                return isPhoto ? '/content/init/' : '/video/init/';
        }
    }
    buildTikokPostInfoBody(firstPost) {
        var _a, _b, _c, _d;
        const isPhoto = (((_c = (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.indexOf('mp4')) || -1) === -1;
        const method = (_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _d === void 0 ? void 0 : _d.content_posting_method;
        if (method === 'DIRECT_POST') {
            return {
                post_info: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (isPhoto && firstPost.settings.title
                    ? { title: firstPost.settings.title.slice(0, 90) }
                    : {})), (!isPhoto && firstPost.message
                    ? { title: firstPost.message }
                    : {})), (isPhoto ? { description: firstPost.message } : {})), { privacy_level: firstPost.settings.privacy_level || 'PUBLIC_TO_EVERYONE' }), (isPhoto
                    ? {}
                    : { disable_duet: !firstPost.settings.duet || false })), { disable_comment: !firstPost.settings.comment || false }), (isPhoto
                    ? {}
                    : { disable_stitch: !firstPost.settings.stitch || false })), (isPhoto
                    ? {}
                    : { is_aigc: firstPost.settings.video_made_with_ai || false })), { brand_content_toggle: firstPost.settings.brand_content_toggle || false, brand_organic_toggle: firstPost.settings.brand_organic_toggle || false }), (isPhoto
                    ? {
                        auto_add_music: firstPost.settings.autoAddMusic === 'yes',
                    }
                    : {})),
            };
        }
        return {
            post_info: Object.assign(Object.assign(Object.assign({}, (isPhoto && firstPost.settings.title
                ? { title: firstPost.settings.title }
                : {})), (!isPhoto && firstPost.message ? { title: firstPost.message } : {})), (isPhoto ? { description: firstPost.message } : {})),
        };
    }
    buildTikokSourceInfoBody(firstPost) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const isPhoto = (((_c = (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.indexOf('mp4')) || -1) === -1;
        if (isPhoto) {
            return {
                post_mode: ((_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _d === void 0 ? void 0 : _d.content_posting_method) === 'DIRECT_POST'
                    ? 'DIRECT_POST'
                    : 'MEDIA_UPLOAD',
                media_type: 'PHOTO',
                source_info: {
                    source: 'PULL_FROM_URL',
                    photo_cover_index: 0,
                    photo_images: (_e = firstPost.media) === null || _e === void 0 ? void 0 : _e.map((p) => p.path),
                },
            };
        }
        return {
            source_info: Object.assign({ source: 'PULL_FROM_URL', video_url: (_g = (_f = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.path }, (((_j = (_h = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.thumbnailTimestamp)
                ? {
                    video_cover_timestamp_ms: (_l = (_k = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.thumbnailTimestamp,
                }
                : {})),
        };
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const [firstPost] = postDetails;
            const isPhoto = (((_c = (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.indexOf('mp4')) || -1) === -1;
            console.log(Object.assign(Object.assign({}, this.buildTikokPostInfoBody(firstPost)), this.buildTikokSourceInfoBody(firstPost)));
            const { data: { publish_id }, } = yield (yield this.fetch(`https://open.tiktokapis.com/v2/post/publish${this.postingMethod(firstPost.settings.content_posting_method, (((_f = (_e = (_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.path) === null || _f === void 0 ? void 0 : _f.indexOf('mp4')) || -1) === -1)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(Object.assign(Object.assign({}, this.buildTikokPostInfoBody(firstPost)), this.buildTikokSourceInfoBody(firstPost))),
            })).json();
            const { url, id: videoId } = yield this.uploadedVideoSuccess(integration.profile, publish_id, accessToken);
            return [
                {
                    id: firstPost.id,
                    releaseURL: url,
                    postId: String(videoId),
                    status: 'success',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                // Get user stats (follower_count, following_count, likes_count, video_count)
                const userStatsResponse = yield this.fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,following_count,likes_count,video_count', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const userStatsData = yield userStatsResponse.json();
                const userStats = (_a = userStatsData === null || userStatsData === void 0 ? void 0 : userStatsData.data) === null || _a === void 0 ? void 0 : _a.user;
                const result = [];
                if (userStats) {
                    if (userStats.follower_count !== undefined) {
                        result.push({
                            label: 'Followers',
                            percentageChange: 0,
                            data: [{ total: String(userStats.follower_count), date: today }],
                        });
                    }
                    if (userStats.following_count !== undefined) {
                        result.push({
                            label: 'Following',
                            percentageChange: 0,
                            data: [{ total: String(userStats.following_count), date: today }],
                        });
                    }
                    if (userStats.likes_count !== undefined) {
                        result.push({
                            label: 'Total Likes',
                            percentageChange: 0,
                            data: [{ total: String(userStats.likes_count), date: today }],
                        });
                    }
                    if (userStats.video_count !== undefined) {
                        result.push({
                            label: 'Videos',
                            percentageChange: 0,
                            data: [{ total: String(userStats.video_count), date: today }],
                        });
                    }
                }
                // Get recent videos and aggregate their stats
                const videoListResponse = yield this.fetch('https://open.tiktokapis.com/v2/video/list/?fields=id', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ max_count: 20 }),
                });
                const videoListData = yield videoListResponse.json();
                const videos = (_b = videoListData === null || videoListData === void 0 ? void 0 : videoListData.data) === null || _b === void 0 ? void 0 : _b.videos;
                if (videos && videos.length > 0) {
                    const videoIds = videos.map((v) => v.id);
                    // Query video details to get engagement metrics
                    const videoQueryResponse = yield this.fetch('https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessToken}`,
                        },
                        body: JSON.stringify({
                            filters: { video_ids: videoIds },
                        }),
                    });
                    const videoQueryData = yield videoQueryResponse.json();
                    const videoDetails = (_c = videoQueryData === null || videoQueryData === void 0 ? void 0 : videoQueryData.data) === null || _c === void 0 ? void 0 : _c.videos;
                    if (videoDetails && videoDetails.length > 0) {
                        let totalViews = 0;
                        let totalLikes = 0;
                        let totalComments = 0;
                        let totalShares = 0;
                        for (const video of videoDetails) {
                            totalViews += video.view_count || 0;
                            totalLikes += video.like_count || 0;
                            totalComments += video.comment_count || 0;
                            totalShares += video.share_count || 0;
                        }
                        result.push({
                            label: 'Views',
                            percentageChange: 0,
                            data: [{ total: String(totalViews), date: today }],
                        });
                        result.push({
                            label: 'Recent Likes',
                            percentageChange: 0,
                            data: [{ total: String(totalLikes), date: today }],
                        });
                        result.push({
                            label: 'Recent Comments',
                            percentageChange: 0,
                            data: [{ total: String(totalComments), date: today }],
                        });
                        result.push({
                            label: 'Recent Shares',
                            percentageChange: 0,
                            data: [{ total: String(totalShares), date: today }],
                        });
                    }
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching TikTok analytics:', err);
                return [];
            }
        });
    }
    missing(id, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const videoListResponse = yield this.fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,cover_image_url,title', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ max_count: 20 }),
                });
                const videoListData = yield videoListResponse.json();
                const videos = (_a = videoListData === null || videoListData === void 0 ? void 0 : videoListData.data) === null || _a === void 0 ? void 0 : _a.videos;
                if (!videos || videos.length === 0) {
                    return [];
                }
                return videos.map((v) => ({
                    id: String(v.id),
                    url: v.cover_image_url,
                }));
            }
            catch (err) {
                console.error('Error fetching TikTok missing content:', err);
                return [];
            }
        });
    }
    postAnalytics(integrationId, accessToken, postId, fromDate) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const today = dayjs().format('YYYY-MM-DD');
            if (postId.indexOf('v_pub_url') > -1) {
                const post = yield (yield this.fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        publish_id: postId,
                    }),
                }, '', 0, true)).json();
                if (!((_b = (_a = post === null || post === void 0 ? void 0 : post.data) === null || _a === void 0 ? void 0 : _a.publicaly_available_post_id) === null || _b === void 0 ? void 0 : _b[0])) {
                    return [];
                }
                postId = post.data.publicaly_available_post_id[0];
            }
            try {
                // Query video details using the video ID
                const response = yield this.fetch('https://open.tiktokapis.com/v2/video/query/?fields=id,like_count,comment_count,share_count,view_count', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        filters: {
                            video_ids: [postId],
                        },
                    }),
                });
                const data = yield response.json();
                const video = (_d = (_c = data === null || data === void 0 ? void 0 : data.data) === null || _c === void 0 ? void 0 : _c.videos) === null || _d === void 0 ? void 0 : _d[0];
                if (!video) {
                    return [];
                }
                const result = [];
                if (video.view_count !== undefined) {
                    result.push({
                        label: 'Views',
                        percentageChange: 0,
                        data: [{ total: String(video.view_count), date: today }],
                    });
                }
                if (video.like_count !== undefined) {
                    result.push({
                        label: 'Likes',
                        percentageChange: 0,
                        data: [{ total: String(video.like_count), date: today }],
                    });
                }
                if (video.comment_count !== undefined) {
                    result.push({
                        label: 'Comments',
                        percentageChange: 0,
                        data: [{ total: String(video.comment_count), date: today }],
                    });
                }
                if (video.share_count !== undefined) {
                    result.push({
                        label: 'Shares',
                        percentageChange: 0,
                        data: [{ total: String(video.share_count), date: today }],
                    });
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching TikTok post analytics:', err);
                return [];
            }
        });
    }
};
TiktokProvider = __decorate([
    Rules('TikTok can have one video or one picture or multiple pictures, it cannot be without an attachment')
], TiktokProvider);
export { TiktokProvider };
//# sourceMappingURL=tiktok.provider.js.map