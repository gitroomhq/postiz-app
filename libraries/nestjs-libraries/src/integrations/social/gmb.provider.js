import { __awaiter, __decorate } from "tslib";
import { makeId } from "../../services/make.is";
import { google } from 'googleapis';
import { SocialAbstract } from "../social.abstract";
import * as process from 'node:process';
import dayjs from 'dayjs';
import { Rules } from "../../chat/rules.description.decorator";
import { GmbSettingsDto } from "../../dtos/posts/providers-settings/gmb.settings.dto";
const clientAndGmb = () => {
    const client = new google.auth.OAuth2({
        clientId: process.env.GOOGLE_GMB_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_GMB_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
        redirectUri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
    });
    const oauth2 = (newClient) => google.oauth2({
        version: 'v2',
        auth: newClient,
    });
    return { client, oauth2 };
};
let GmbProvider = class GmbProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 3;
        this.identifier = 'gmb';
        this.name = 'Google My Business';
        this.isBetweenSteps = true;
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/business.manage',
        ];
        this.editor = 'normal';
        this.dto = GmbSettingsDto;
    }
    maxLength() {
        return 1500;
    }
    handleErrors(body) {
        if (body.includes('UNAUTHENTICATED') || body.includes('invalid_grant')) {
            return {
                type: 'refresh-token',
                value: 'Please re-authenticate your Google My Business account',
            };
        }
        if (body.includes('Unauthorized')) {
            return {
                type: 'refresh-token',
                value: 'Token expired or invalid, please reconnect your YouTube account.',
            };
        }
        if (body.includes('PERMISSION_DENIED')) {
            return {
                type: 'refresh-token',
                value: 'Permission denied. Please ensure you have access to this business location.',
            };
        }
        if (body.includes('NOT_FOUND')) {
            return {
                type: 'bad-body',
                value: 'Business location not found. It may have been deleted.',
            };
        }
        if (body.includes('INVALID_ARGUMENT')) {
            return {
                type: 'bad-body',
                value: 'Invalid post content. Please check your post details.',
            };
        }
        if (body.includes('RESOURCE_EXHAUSTED')) {
            return {
                type: 'bad-body',
                value: 'Rate limit exceeded. Please try again later.',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndGmb();
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
                refreshToken: credentials.refresh_token || refresh_token,
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
            const { client } = clientAndGmb();
            return {
                url: client.generateAuthUrl({
                    access_type: 'offline',
                    prompt: 'consent',
                    state,
                    redirect_uri: `${process.env.FRONTEND_URL}/integrations/social/gmb`,
                    scope: this.scopes.slice(0),
                }),
                codeVerifier: makeId(11),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { client, oauth2 } = clientAndGmb();
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
            var _a;
            // Get all accounts with pagination
            const allAccounts = [];
            let accountsPageToken;
            do {
                const params = new URLSearchParams();
                if (accountsPageToken) {
                    params.set('pageToken', accountsPageToken);
                }
                const url = `https://mybusinessaccountmanagement.googleapis.com/v1/accounts${params.toString() ? `?${params}` : ''}`;
                const accountsResponse = yield fetch(url, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const accountsData = yield accountsResponse.json();
                if (accountsData.accounts) {
                    allAccounts.push(...accountsData.accounts);
                }
                accountsPageToken = accountsData.nextPageToken;
            } while (accountsPageToken);
            if (allAccounts.length === 0) {
                return [];
            }
            // Get locations for each account
            const allLocations = [];
            for (const account of allAccounts) {
                const accountName = account.name; // format: accounts/{accountId}
                try {
                    // Get all locations with pagination
                    let locationsPageToken;
                    do {
                        const params = new URLSearchParams({
                            readMask: 'name,title,storefrontAddress,metadata',
                        });
                        if (locationsPageToken) {
                            params.set('pageToken', locationsPageToken);
                        }
                        const locationsResponse = yield fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?${params}`, {
                            headers: {
                                Authorization: `Bearer ${accessToken}`,
                            },
                        });
                        const locationsData = yield locationsResponse.json();
                        if (locationsData.locations) {
                            for (const location of locationsData.locations) {
                                // location.name is in format: locations/{locationId}
                                // We need the full path: accounts/{accountId}/locations/{locationId}
                                const locationId = location.name.replace('locations/', '');
                                const fullResourceName = `${accountName}/locations/${locationId}`;
                                // Get profile photo if available
                                let photoUrl = '';
                                try {
                                    const mediaResponse = yield fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${location.name}/media`, {
                                        headers: {
                                            Authorization: `Bearer ${accessToken}`,
                                        },
                                    });
                                    const mediaData = yield mediaResponse.json();
                                    if (mediaData.mediaItems && mediaData.mediaItems.length > 0) {
                                        const profilePhoto = mediaData.mediaItems.find((m) => {
                                            var _a;
                                            return m.mediaFormat === 'PHOTO' &&
                                                ((_a = m.locationAssociation) === null || _a === void 0 ? void 0 : _a.category) === 'PROFILE';
                                        });
                                        if (profilePhoto === null || profilePhoto === void 0 ? void 0 : profilePhoto.googleUrl) {
                                            photoUrl = profilePhoto.googleUrl;
                                        }
                                        else if ((_a = mediaData.mediaItems[0]) === null || _a === void 0 ? void 0 : _a.googleUrl) {
                                            photoUrl = mediaData.mediaItems[0].googleUrl;
                                        }
                                    }
                                }
                                catch (_b) {
                                    // Ignore media fetch errors
                                }
                                allLocations.push({
                                    // id is the full resource path for the v4 API: accounts/{accountId}/locations/{locationId}
                                    id: fullResourceName,
                                    name: location.title || 'Unnamed Location',
                                    picture: { data: { url: photoUrl } },
                                    accountName: accountName,
                                    locationName: location.name,
                                });
                            }
                        }
                        locationsPageToken = locationsData.nextPageToken;
                    } while (locationsPageToken);
                }
                catch (error) {
                    // Continue with other accounts if one fails
                    console.error(`Failed to fetch locations for account ${accountName}:`, error);
                }
            }
            return allLocations;
        });
    }
    fetchPageInformation(accessToken, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // data.id is the full resource path: accounts/{accountId}/locations/{locationId}
            // data.locationName is the v1 API format: locations/{locationId}
            // Fetch location details using the v1 API format
            const locationResponse = yield fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${data.locationName}?readMask=name,title,storefrontAddress,metadata`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const locationData = yield locationResponse.json();
            // Try to get profile photo
            let photoUrl = '';
            try {
                const mediaResponse = yield fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${data.locationName}/media`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const mediaData = yield mediaResponse.json();
                if (mediaData.mediaItems && mediaData.mediaItems.length > 0) {
                    const profilePhoto = mediaData.mediaItems.find((m) => {
                        var _a;
                        return m.mediaFormat === 'PHOTO' &&
                            ((_a = m.locationAssociation) === null || _a === void 0 ? void 0 : _a.category) === 'PROFILE';
                    });
                    if (profilePhoto === null || profilePhoto === void 0 ? void 0 : profilePhoto.googleUrl) {
                        photoUrl = profilePhoto.googleUrl;
                    }
                    else if ((_a = mediaData.mediaItems[0]) === null || _a === void 0 ? void 0 : _a.googleUrl) {
                        photoUrl = mediaData.mediaItems[0].googleUrl;
                    }
                }
            }
            catch (_b) {
                // Ignore media fetch errors
            }
            return {
                // Return the full resource path as id (for v4 Local Posts API)
                id: data.id,
                name: locationData.title || 'Unnamed Location',
                access_token: accessToken,
                picture: photoUrl,
                username: '',
            };
        });
    }
    reConnect(id, requiredId, accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const pages = yield this.pages(accessToken);
            const findPage = pages.find((p) => p.id === requiredId);
            if (!findPage) {
                throw new Error('Location not found');
            }
            const information = yield this.fetchPageInformation(accessToken, {
                id: requiredId,
                accountName: findPage.accountName,
                locationName: findPage.locationName,
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
            const [firstPost] = postDetails;
            const { settings } = firstPost;
            // Build the local post request body
            const postBody = {
                languageCode: 'en',
                summary: firstPost.message,
                topicType: (settings === null || settings === void 0 ? void 0 : settings.topicType) || 'STANDARD',
            };
            // Add call to action if provided (and not NONE)
            if ((settings === null || settings === void 0 ? void 0 : settings.callToActionType) &&
                settings.callToActionType !== 'NONE' &&
                (settings === null || settings === void 0 ? void 0 : settings.callToActionUrl)) {
                postBody.callToAction = {
                    actionType: settings.callToActionType,
                    url: settings.callToActionUrl,
                };
            }
            // Add media if provided
            if (firstPost.media && firstPost.media.length > 0) {
                const mediaItem = firstPost.media[0];
                postBody.media = [
                    {
                        mediaFormat: mediaItem.type === 'video' ? 'VIDEO' : 'PHOTO',
                        sourceUrl: mediaItem.path,
                    },
                ];
            }
            // Add event details if it's an event post
            if ((settings === null || settings === void 0 ? void 0 : settings.topicType) === 'EVENT' && (settings === null || settings === void 0 ? void 0 : settings.eventTitle)) {
                postBody.event = {
                    title: settings.eventTitle,
                    schedule: Object.assign(Object.assign({ startDate: this.formatDate(settings.eventStartDate), endDate: this.formatDate(settings.eventEndDate) }, (settings.eventStartTime && {
                        startTime: this.formatTime(settings.eventStartTime),
                    })), (settings.eventEndTime && {
                        endTime: this.formatTime(settings.eventEndTime),
                    })),
                };
            }
            // Add offer details if it's an offer post
            if ((settings === null || settings === void 0 ? void 0 : settings.topicType) === 'OFFER') {
                postBody.offer = {
                    couponCode: (settings === null || settings === void 0 ? void 0 : settings.offerCouponCode) || undefined,
                    redeemOnlineUrl: (settings === null || settings === void 0 ? void 0 : settings.offerRedeemUrl) || undefined,
                    termsConditions: (settings === null || settings === void 0 ? void 0 : settings.offerTerms) || undefined,
                };
            }
            // Create the local post
            const response = yield this.fetch(`https://mybusiness.googleapis.com/v4/${id}/localPosts`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postBody),
            }, 'create local post');
            const postData = yield response.json();
            // Extract the post ID and construct the URL
            const postId = postData.name || '';
            const locationId = id.split('/').pop();
            // GMB posts don't have direct URLs, but we can link to the business profile
            const releaseURL = `https://business.google.com/locations/${locationId}`;
            return [
                {
                    id: firstPost.id,
                    postId: postId,
                    releaseURL: releaseURL,
                    status: 'success',
                },
            ];
        });
    }
    formatDate(dateString) {
        if (!dateString) {
            return {
                year: dayjs().year(),
                month: dayjs().month() + 1,
                day: dayjs().date(),
            };
        }
        const date = dayjs(dateString);
        return {
            year: date.year(),
            month: date.month() + 1,
            day: date.date(),
        };
    }
    formatTime(timeString) {
        if (!timeString) {
            return undefined;
        }
        const [hours, minutes] = timeString.split(':').map(Number);
        return {
            hours: hours || 0,
            minutes: minutes || 0,
            seconds: 0,
            nanos: 0,
        };
    }
    analytics(id, accessToken, date) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const endDate = dayjs().format('YYYY-MM-DD');
                const startDate = dayjs().subtract(date, 'day').format('YYYY-MM-DD');
                // id is in format: accounts/{accountId}/locations/{locationId}
                // Business Profile Performance API expects: locations/{locationId}
                const locationId = id.split('/locations/')[1];
                const locationPath = `locations/${locationId}`;
                // Use the Business Profile Performance API
                const response = yield fetch(`https://businessprofileperformance.googleapis.com/v1/${locationPath}:fetchMultiDailyMetricsTimeSeries?dailyMetrics=WEBSITE_CLICKS&dailyMetrics=CALL_CLICKS&dailyMetrics=BUSINESS_DIRECTION_REQUESTS&dailyMetrics=BUSINESS_IMPRESSIONS_DESKTOP_MAPS&dailyMetrics=BUSINESS_IMPRESSIONS_MOBILE_MAPS&dailyRange.startDate.year=${dayjs(startDate).year()}&dailyRange.startDate.month=${dayjs(startDate).month() + 1}&dailyRange.startDate.day=${dayjs(startDate).date()}&dailyRange.endDate.year=${dayjs(endDate).year()}&dailyRange.endDate.month=${dayjs(endDate).month() + 1}&dailyRange.endDate.day=${dayjs(endDate).date()}`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const data = yield response.json();
                // Response structure: { multiDailyMetricTimeSeries: [{ dailyMetricTimeSeries: [...] }] }
                const dailyMetricTimeSeries = (_b = (_a = data.multiDailyMetricTimeSeries) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.dailyMetricTimeSeries;
                if (!dailyMetricTimeSeries || dailyMetricTimeSeries.length === 0) {
                    return [];
                }
                const metricLabels = {
                    WEBSITE_CLICKS: 'Website Clicks',
                    CALL_CLICKS: 'Phone Calls',
                    BUSINESS_DIRECTION_REQUESTS: 'Direction Requests',
                    BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'Desktop Map Views',
                    BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'Mobile Map Views',
                };
                const analytics = [];
                for (const series of dailyMetricTimeSeries) {
                    const metricName = series.dailyMetric;
                    const label = metricLabels[metricName] || metricName;
                    const datedValues = ((_c = series.timeSeries) === null || _c === void 0 ? void 0 : _c.datedValues) || [];
                    const dataPoints = datedValues.map((dv) => ({
                        total: parseInt(dv.value || '0', 10),
                        date: `${dv.date.year}-${String(dv.date.month).padStart(2, '0')}-${String(dv.date.day).padStart(2, '0')}`,
                    }));
                    if (dataPoints.length > 0) {
                        analytics.push({
                            label,
                            percentageChange: 0,
                            data: dataPoints,
                        });
                    }
                }
                return analytics;
            }
            catch (error) {
                console.error('Error fetching GMB analytics:', error);
                return [];
            }
        });
    }
    postAnalytics(integrationId, accessToken, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            // Google My Business local posts don't have detailed individual post analytics
            // The API focuses on location-level metrics rather than post-level metrics
            return [];
        });
    }
};
GmbProvider = __decorate([
    Rules('Google My Business posts can have text content and optionally one image. Posts can be updates, events, or offers.')
], GmbProvider);
export { GmbProvider };
//# sourceMappingURL=gmb.provider.js.map