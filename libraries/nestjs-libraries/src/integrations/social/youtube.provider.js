import { __awaiter, __decorate } from "tslib";
import { makeId } from "../../services/make.is";
import { google } from 'googleapis';
import axios from 'axios';
import { YoutubeSettingsDto } from "../../dtos/posts/providers-settings/youtube.settings.dto";
import { SocialAbstract, } from "../social.abstract";
import * as process from 'node:process';
import dayjs from 'dayjs';
import { Rules } from "../../chat/rules.description.decorator";
const clientAndYoutube = () => {
    const client = new google.auth.OAuth2({
        clientId: process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
    });
    const youtube = (newClient) => google.youtube({
        version: 'v3',
        auth: newClient,
    });
    const youtubeAnalytics = (newClient) => google.youtubeAnalytics({
        version: 'v2',
        auth: newClient,
    });
    const oauth2 = (newClient) => google.oauth2({
        version: 'v2',
        auth: newClient,
    });
    return { client, youtube, oauth2, youtubeAnalytics };
};
let YoutubeProvider = class YoutubeProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 200; // YouTube has strict upload quotas
        this.identifier = 'youtube';
        this.name = 'YouTube';
        this.isBetweenSteps = true;
        this.dto = YoutubeSettingsDto;
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.force-ssl',
            'https://www.googleapis.com/auth/youtube.readonly',
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtubepartner',
            'https://www.googleapis.com/auth/yt-analytics.readonly',
        ];
        this.editor = 'normal';
    }
    maxLength() {
        return 5000;
    }
    handleErrors(body) {
        if (body.includes('invalidTitle')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but we could not set the title. Title is too long.',
            };
        }
        if (body.includes('failedPrecondition')) {
            return {
                type: 'bad-body',
                value: 'We have uploaded your video but we could not set the thumbnail. Thumbnail size is too large.',
            };
        }
        if (body.includes('uploadLimitExceeded')) {
            return {
                type: 'bad-body',
                value: 'You have reached your daily upload limit, please try again tomorrow.',
            };
        }
        if (body.includes('youtubeSignupRequired')) {
            return {
                type: 'bad-body',
                value: 'You have to link your youtube account to your google account first.',
            };
        }
        if (body.includes('youtube.thumbnail')) {
            return {
                type: 'bad-body',
                value: 'Your account is not verified, we have uploaded your video but we could not set the thumbnail. Please verify your account and try again.',
            };
        }
        if (body.includes('Unauthorized')) {
            return {
                type: 'refresh-token',
                value: 'Token expired or invalid, please reconnect your YouTube account.',
            };
        }
        if (body.includes('UNAUTHENTICATED') || body.includes('invalid_grant')) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your YouTube account',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndYoutube();
            client.setCredentials({ refresh_token });
            const { credentials } = yield client.refreshAccessToken();
            const user = oauth2(client);
            const expiryDate = new Date(credentials.expiry_date);
            const unixTimestamp = Math.floor(expiryDate.getTime() / 1000) -
                Math.floor(new Date().getTime() / 1000);
            const { data } = yield user.userinfo.get();
            return {
                accessToken: credentials.access_token,
                expiresIn: unixTimestamp,
                refreshToken: credentials.refresh_token,
                id: data.id,
                name: data.name,
                picture: (data === null || data === void 0 ? void 0 : data.picture) || '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(7);
            const { client } = clientAndYoutube();
            return {
                url: client.generateAuthUrl({
                    access_type: 'offline',
                    prompt: 'consent',
                    state,
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/youtube`,
                    scope: this.scopes.slice(0),
                }),
                codeVerifier: makeId(11),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndYoutube();
            const { tokens } = yield client.getToken(params.code);
            client.setCredentials(tokens);
            const { scopes } = yield client.getTokenInfo(tokens.access_token);
            this.checkScopes(this.scopes, scopes);
            const user = oauth2(client);
            const { data } = yield user.userinfo.get();
            const expiryDate = new Date(tokens.expiry_date);
            const unixTimestamp = Math.floor(expiryDate.getTime() / 1000) -
                Math.floor(new Date().getTime() / 1000);
            return {
                accessToken: tokens.access_token,
                expiresIn: unixTimestamp,
                refreshToken: tokens.refresh_token,
                id: data.id,
                name: data.name,
                picture: (data === null || data === void 0 ? void 0 : data.picture) || '',
                username: '',
            };
        });
    }
    pages(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, youtube } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtube(client);
            try {
                // Get all channels the user has access to
                const response = yield youtubeClient.channels.list({
                    part: ['snippet', 'contentDetails', 'statistics'],
                    mine: true,
                });
                const channels = response.data.items || [];
                return channels.map((channel) => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        id: channel.id,
                        name: ((_a = channel.snippet) === null || _a === void 0 ? void 0 : _a.title) || 'Unnamed Channel',
                        picture: {
                            data: {
                                url: ((_d = (_c = (_b = channel.snippet) === null || _b === void 0 ? void 0 : _b.thumbnails) === null || _c === void 0 ? void 0 : _c.default) === null || _d === void 0 ? void 0 : _d.url) || '',
                            },
                        },
                        username: ((_e = channel.snippet) === null || _e === void 0 ? void 0 : _e.customUrl) || '',
                        subscriberCount: ((_f = channel.statistics) === null || _f === void 0 ? void 0 : _f.subscriberCount) || '0',
                    });
                });
            }
            catch (error) {
                console.error('Failed to fetch YouTube channels:', error);
                return [];
            }
        });
    }
    fetchPageInformation(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const { client, youtube } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtube(client);
            try {
                const response = yield youtubeClient.channels.list({
                    part: ['snippet', 'contentDetails', 'statistics'],
                    id: [data.id],
                });
                const channel = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0];
                if (!channel) {
                    throw new Error('Channel not found');
                }
                return {
                    id: channel.id,
                    name: ((_b = channel.snippet) === null || _b === void 0 ? void 0 : _b.title) || 'Unnamed Channel',
                    access_token: accessToken,
                    picture: ((_e = (_d = (_c = channel.snippet) === null || _c === void 0 ? void 0 : _c.thumbnails) === null || _d === void 0 ? void 0 : _d.default) === null || _e === void 0 ? void 0 : _e.url) || '',
                    username: ((_f = channel.snippet) === null || _f === void 0 ? void 0 : _f.customUrl) || '',
                };
            }
            catch (error) {
                console.error('Failed to fetch YouTube channel information:', error);
                throw error;
            }
        });
    }
    reConnect(id, requiredId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const pages = yield this.pages(accessToken);
            const findPage = pages.find((p) => p.id === requiredId);
            if (!findPage) {
                throw new Error('Channel not found');
            }
            const information = yield this.fetchPageInformation(accessToken, {
                id: requiredId,
            });
            return {
                id: information.id,
                name: information.name,
                accessToken: information.access_token,
                picture: information.picture,
                username: information.username,
            };
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const [firstPost, ...comments] = postDetails;
            const { client, youtube } = clientAndYoutube();
            client.setCredentials({ access_token: accessToken });
            const youtubeClient = youtube(client);
            const { settings } = firstPost;
            const response = yield axios({
                url: (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path,
                method: 'GET',
                responseType: 'stream',
            });
            const all = yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                var _a;
                return youtubeClient.videos.insert({
                    part: ['id', 'snippet', 'status'],
                    notifySubscribers: true,
                    requestBody: {
                        snippet: Object.assign({ title: settings.title, description: firstPost === null || firstPost === void 0 ? void 0 : firstPost.message }, (((_a = settings === null || settings === void 0 ? void 0 : settings.tags) === null || _a === void 0 ? void 0 : _a.length)
                            ? { tags: settings.tags.map((p) => p.label) }
                            : {})),
                        status: {
                            privacyStatus: settings.type,
                            selfDeclaredMadeForKids: settings.selfDeclaredMadeForKids === 'yes',
                        },
                    },
                    media: {
                        body: response.data,
                    },
                });
            }), true);
            if ((_c = settings === null || settings === void 0 ? void 0 : settings.thumbnail) === null || _c === void 0 ? void 0 : _c.path) {
                yield this.runInConcurrent(() => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    return youtubeClient.thumbnails.set({
                        videoId: (_a = all === null || all === void 0 ? void 0 : all.data) === null || _a === void 0 ? void 0 : _a.id,
                        media: {
                            body: (yield axios({
                                url: (_b = settings === null || settings === void 0 ? void 0 : settings.thumbnail) === null || _b === void 0 ? void 0 : _b.path,
                                method: 'GET',
                                responseType: 'stream',
                            })).data,
                        },
                    });
                }));
            }
            return [
                {
                    id: firstPost.id,
                    releaseURL: `https://www.youtube.com/watch?v=${(_d = all === null || all === void 0 ? void 0 : all.data) === null || _d === void 0 ? void 0 : _d.id}`,
                    postId: (_e = all === null || all === void 0 ? void 0 : all.data) === null || _e === void 0 ? void 0 : _e.id,
                    status: 'success',
                },
            ];
        });
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const endDate = dayjs().format('YYYY-MM-DD');
                const startDate = dayjs().subtract(date, 'day').format('YYYY-MM-DD');
                const { client, youtubeAnalytics } = clientAndYoutube();
                client.setCredentials({ access_token: accessToken });
                const youtubeClient = youtubeAnalytics(client);
                const { data } = yield youtubeClient.reports.query({
                    ids: 'channel==MINE',
                    startDate,
                    endDate,
                    metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,subscribersLost',
                    dimensions: 'day',
                    sort: 'day',
                });
                const columns = (_a = data === null || data === void 0 ? void 0 : data.columnHeaders) === null || _a === void 0 ? void 0 : _a.map((p) => p.name);
                const mappedData = (_b = data === null || data === void 0 ? void 0 : data.rows) === null || _b === void 0 ? void 0 : _b.map((p) => {
                    return columns.reduce((acc, curr, index) => {
                        acc[curr] = p[index];
                        return acc;
                    }, {});
                });
                const acc = [];
                acc.push({
                    label: 'Estimated Minutes Watched',
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.estimatedMinutesWatched,
                        date: p.day,
                    })),
                });
                acc.push({
                    label: 'Average View Duration',
                    average: true,
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.averageViewDuration,
                        date: p.day,
                    })),
                });
                acc.push({
                    label: 'Average View Percentage',
                    average: true,
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.averageViewPercentage,
                        date: p.day,
                    })),
                });
                acc.push({
                    label: 'Subscribers Gained',
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.subscribersGained,
                        date: p.day,
                    })),
                });
                acc.push({
                    label: 'Subscribers Lost',
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.subscribersLost,
                        date: p.day,
                    })),
                });
                acc.push({
                    label: 'Likes',
                    data: mappedData === null || mappedData === void 0 ? void 0 : mappedData.map((p) => ({
                        total: p.likes,
                        date: p.day,
                    })),
                });
                return acc;
            }
            catch (err) {
                return [];
            }
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const today = dayjs().format('YYYY-MM-DD');
            try {
                const { client, youtube } = clientAndYoutube();
                client.setCredentials({ access_token: accessToken });
                const youtubeClient = youtube(client);
                // Fetch video statistics
                const response = yield youtubeClient.videos.list({
                    part: ['statistics', 'snippet'],
                    id: [postId],
                });
                const video = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0];
                if (!video || !video.statistics) {
                    return [];
                }
                const stats = video.statistics;
                const result = [];
                if (stats.viewCount !== undefined) {
                    result.push({
                        label: 'Views',
                        percentageChange: 0,
                        data: [{ total: String(stats.viewCount), date: today }],
                    });
                }
                if (stats.likeCount !== undefined) {
                    result.push({
                        label: 'Likes',
                        percentageChange: 0,
                        data: [{ total: String(stats.likeCount), date: today }],
                    });
                }
                if (stats.commentCount !== undefined) {
                    result.push({
                        label: 'Comments',
                        percentageChange: 0,
                        data: [{ total: String(stats.commentCount), date: today }],
                    });
                }
                if (stats.favoriteCount !== undefined) {
                    result.push({
                        label: 'Favorites',
                        percentageChange: 0,
                        data: [{ total: String(stats.favoriteCount), date: today }],
                    });
                }
                return result;
            }
            catch (err) {
                console.error('Error fetching YouTube post analytics:', err);
                return [];
            }
        });
    }
};
YoutubeProvider = __decorate([
    Rules('YouTube must have on video attachment, it cannot be empty')
], YoutubeProvider);
export { YoutubeProvider };
//# sourceMappingURL=youtube.provider.js.map