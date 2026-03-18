import { __awaiter, __decorate, __metadata, __rest } from "tslib";
import { makeId } from "../../services/make.is";
import sharp from 'sharp';
import { lookup } from 'mime-types';
import { readOrFetch } from "../../../../helpers/src/utils/read.or.fetch";
import { SocialAbstract } from "../social.abstract";
import { PostPlug } from "../../../../helpers/src/decorators/post.plug";
import imageToPDF from 'image-to-pdf';
import { Rules } from "../../chat/rules.description.decorator";
let LinkedinProvider = class LinkedinProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'linkedin';
        this.name = 'LinkedIn';
        this.oneTimeToken = true;
        this.isBetweenSteps = false;
        this.scopes = [
            'openid',
            'profile',
            'w_member_social',
            'r_basicprofile',
            'rw_organization_admin',
            'w_organization_social',
            'r_organization_social',
        ];
        this.maxConcurrentJob = 2; // LinkedIn has professional posting limits
        this.refreshWait = true;
        this.editor = 'normal';
    }
    maxLength() {
        return 3000;
    }
    handleErrors(body) {
        if (body.indexOf('Unable to obtain activity') > -1) {
            return {
                type: 'retry',
                value: 'Unable to obtain activity',
            };
        }
        if (body.indexOf('resource is forbidden') > -1) {
            return {
                type: 'retry',
                value: 'Resource is forbidden',
            };
        }
        return undefined;
    }
    refreshToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            const { access_token: accessToken, refresh_token: refreshToken, expires_in, } = yield (yield fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token,
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                }),
            })).json();
            const { vanityName } = yield (yield fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            const { name, sub: id, picture, } = yield (yield fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id,
                accessToken,
                refreshToken,
                expiresIn: expires_in,
                name,
                picture: picture || '',
                username: vanityName,
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            const codeVerifier = makeId(30);
            const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&prompt=none&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/integrations/social/linkedin`)}&state=${state}&scope=${encodeURIComponent(this.scopes.join(' '))}`;
            return {
                url,
                codeVerifier,
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = new URLSearchParams();
            body.append('grant_type', 'authorization_code');
            body.append('code', params.code);
            body.append('redirect_uri', `${process.env.FRONTEND_URL}/integrations/social/linkedin${params.refresh ? `?refresh=${params.refresh}` : ''}`);
            body.append('client_id', process.env.LINKEDIN_CLIENT_ID);
            body.append('client_secret', process.env.LINKEDIN_CLIENT_SECRET);
            const { access_token: accessToken, expires_in: expiresIn, refresh_token: refreshToken, scope, } = yield (yield fetch('https://www.linkedin.com/oauth/v2/accessToken', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            })).json();
            this.checkScopes(this.scopes, scope);
            const { name, sub: id, picture, } = yield (yield fetch('https://api.linkedin.com/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            const { vanityName } = yield (yield fetch('https://api.linkedin.com/v2/me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })).json();
            return {
                id,
                accessToken,
                refreshToken,
                expiresIn,
                name,
                picture,
                username: vanityName,
            };
        });
    }
    company(token, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { url } = data;
            const getCompanyVanity = url.match(/^https?:\/\/(?:www\.)?linkedin\.com\/company\/([^/]+)\/?$/);
            if (!getCompanyVanity || !(getCompanyVanity === null || getCompanyVanity === void 0 ? void 0 : getCompanyVanity.length)) {
                throw new Error('Invalid LinkedIn company URL');
            }
            const { elements } = yield (yield fetch(`https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${getCompanyVanity[1]}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${token}`,
                },
            })).json();
            return {
                options: (_a = elements.map((e) => ({
                    label: e.localizedName,
                    value: `@[${e.localizedName}](urn:li:organization:${e.id})`,
                }))) === null || _a === void 0 ? void 0 : _a[0],
            };
        });
    }
    uploadPicture(fileName_1, accessToken_1, personId_1, picture_1) {
        return __awaiter(this, arguments, void 0, function* (fileName, accessToken, personId, picture, type = 'personal') {
            var _a;
            // Determine the appropriate endpoint based on file type
            const isVideo = fileName.indexOf('mp4') > -1;
            const isPdf = fileName.toLowerCase().indexOf('pdf') > -1;
            let endpoint;
            if (isVideo) {
                endpoint = 'videos';
            }
            else if (isPdf) {
                endpoint = 'documents';
            }
            else {
                endpoint = 'images';
            }
            const _b = (yield (yield this.fetch(`https://api.linkedin.com/rest/${endpoint}?action=initializeUpload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    initializeUploadRequest: Object.assign({ owner: type === 'personal'
                            ? `urn:li:person:${personId}`
                            : `urn:li:organization:${personId}` }, (isVideo
                        ? {
                            fileSizeBytes: picture.length,
                            uploadCaptions: false,
                            uploadThumbnail: false,
                        }
                        : {})),
                }),
            })).json()).value, { uploadUrl, image, video, document, uploadInstructions } = _b, all = __rest(_b, ["uploadUrl", "image", "video", "document", "uploadInstructions"]);
            const sendUrlRequest = ((_a = uploadInstructions === null || uploadInstructions === void 0 ? void 0 : uploadInstructions[0]) === null || _a === void 0 ? void 0 : _a.uploadUrl) || uploadUrl;
            const finalOutput = video || image || document;
            const etags = [];
            for (let i = 0; i < picture.length; i += 1024 * 1024 * 2) {
                const upload = yield this.fetch(sendUrlRequest, {
                    method: 'PUT',
                    headers: Object.assign({ 'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': '202601', Authorization: `Bearer ${accessToken}` }, (isVideo
                        ? { 'Content-Type': 'application/octet-stream' }
                        : isPdf
                            ? { 'Content-Type': 'application/pdf' }
                            : {})),
                    body: picture.slice(i, i + 1024 * 1024 * 2),
                }, 'linkedin', 0, true);
                etags.push(upload.headers.get('etag'));
            }
            if (isVideo) {
                const a = yield this.fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
                    method: 'POST',
                    body: JSON.stringify({
                        finalizeUploadRequest: {
                            video,
                            uploadToken: '',
                            uploadedPartIds: etags,
                        },
                    }),
                    headers: {
                        'X-Restli-Protocol-Version': '2.0.0',
                        'LinkedIn-Version': '202601',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }
            return finalOutput;
        });
    }
    fixText(text) {
        const pattern = /@\[.+?]\(urn:li:organization.+?\)/g;
        const matches = text.match(pattern) || [];
        const splitAll = text.split(pattern);
        const splitTextReformat = splitAll.map((p) => {
            return p
                .replace(/\\/g, '\\\\')
                .replace(/</g, '\\<')
                .replace(/>/g, '\\>')
                .replace(/#/g, '\\#')
                .replace(/~/g, '\\~')
                .replace(/_/g, '\\_')
                .replace(/\|/g, '\\|')
                .replace(/\[/g, '\\[')
                .replace(/]/g, '\\]')
                .replace(/\*/g, '\\*')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/\{/g, '\\{')
                .replace(/}/g, '\\}')
                .replace(/@/g, '\\@');
        });
        const connectAll = splitTextReformat.reduce((all, current) => {
            const match = matches.shift();
            all.push(current);
            if (match) {
                all.push(match);
            }
            return all;
        }, []);
        return connectAll.join('');
    }
    convertImagesToPdfCarousel(postDetails, firstPost) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!((_a = firstPost.media) === null || _a === void 0 ? void 0 : _a.length)) {
                return postDetails;
            }
            // Fetch all images and get their dimensions
            const images = yield Promise.all(firstPost.media.map((media) => __awaiter(this, void 0, void 0, function* () {
                const raw = yield readOrFetch(media.path);
                const image = sharp(raw, { animated: false }).toFormat('jpeg');
                const { width, height } = yield image.metadata();
                const buffer = yield image.toBuffer();
                return { buffer, width: width || 0, height: height || 0 };
            })));
            // Find the largest image by area to use as the PDF page size
            const largest = images.reduce((max, img) => img.width * img.height > max.width * max.height ? img : max);
            const imageBuffers = images.map((img) => img.buffer);
            // Create a PDF sized to the largest image; it fills the page,
            // smaller images are fitted and centered within the same dimensions
            const pdfStream = imageToPDF(imageBuffers, [largest.width, largest.height]);
            const pdfBuffer = yield this.streamToBuffer(pdfStream);
            // Replace the first post's media with the single PDF
            const [first, ...rest] = postDetails;
            return [
                Object.assign(Object.assign({}, first), { media: [
                        {
                            type: 'image',
                            path: 'carousel.pdf',
                            buffer: pdfBuffer,
                        },
                    ] }),
                ...rest,
            ];
        });
    }
    streamToBuffer(stream) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });
        });
    }
    processMediaForPosts(postDetails, accessToken, personId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const mediaUploads = yield Promise.all(postDetails.flatMap((post) => {
                var _a;
                return ((_a = post.media) === null || _a === void 0 ? void 0 : _a.map((media) => __awaiter(this, void 0, void 0, function* () {
                    let mediaBuffer;
                    // Check if media has a buffer (from PDF conversion)
                    if (media &&
                        typeof media === 'object' &&
                        'buffer' in media &&
                        Buffer.isBuffer(media.buffer)) {
                        mediaBuffer = media.buffer;
                    }
                    else {
                        mediaBuffer = yield this.prepareMediaBuffer(media.path);
                    }
                    const uploadedMediaId = yield this.uploadPicture(media.path, accessToken, personId, mediaBuffer, type);
                    return {
                        id: uploadedMediaId,
                        postId: post.id,
                    };
                }))) || [];
            }));
            return mediaUploads.reduce((acc, upload) => {
                if (!(upload === null || upload === void 0 ? void 0 : upload.id))
                    return acc;
                acc[upload.postId] = acc[upload.postId] || [];
                acc[upload.postId].push(upload.id);
                return acc;
            }, {});
        });
    }
    prepareMediaBuffer(mediaUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const isVideo = mediaUrl.indexOf('mp4') > -1;
            if (isVideo) {
                return Buffer.from(yield readOrFetch(mediaUrl));
            }
            return yield sharp(yield readOrFetch(mediaUrl), {
                animated: lookup(mediaUrl) === 'image/gif',
            })
                .toFormat('jpeg')
                .resize({ width: 1000 })
                .toBuffer();
        });
    }
    buildPostContent(isPdf, mediaIds, pdfTitle) {
        if (mediaIds.length === 0) {
            return {};
        }
        if (mediaIds.length === 1) {
            return {
                content: {
                    media: Object.assign(Object.assign({}, (isPdf ? { title: pdfTitle || 'slides' } : {})), { id: mediaIds[0] }),
                },
            };
        }
        return {
            content: {
                multiImage: {
                    images: mediaIds.map((id) => ({ id })),
                },
            },
        };
    }
    createLinkedInPostPayload(id, type, message, mediaIds, isPdf, pdfTitle) {
        const author = type === 'personal' ? `urn:li:person:${id}` : `urn:li:organization:${id}`;
        return Object.assign(Object.assign({ author, commentary: this.fixText(message), visibility: 'PUBLIC', distribution: {
                feedDistribution: 'MAIN_FEED',
                targetEntities: [],
                thirdPartyDistributionChannels: [],
            } }, this.buildPostContent(isPdf, mediaIds, pdfTitle)), { lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false });
    }
    createMainPost(id, accessToken, firstPost, mediaIds, type, isPdf) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const pdfTitle = isPdf
                ? ((_a = firstPost.settings) === null || _a === void 0 ? void 0 : _a.carousel_name) || 'slides'
                : undefined;
            const postPayload = this.createLinkedInPostPayload(id, type, firstPost.message, mediaIds, isPdf, pdfTitle);
            const response = yield this.fetch(`https://api.linkedin.com/rest/posts`, {
                method: 'POST',
                headers: {
                    'LinkedIn-Version': '202601',
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(postPayload),
            });
            if (response.status !== 201 && response.status !== 200) {
                throw new Error('Error posting to LinkedIn');
            }
            return response.headers.get('x-restli-id');
        });
    }
    createCommentPost(id, accessToken, post, parentPostId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const actor = type === 'personal' ? `urn:li:person:${id}` : `urn:li:organization:${id}`;
            const response = yield this.fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(parentPostId)}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    actor,
                    object: parentPostId,
                    message: {
                        text: this.fixText(post.message),
                    },
                }),
            });
            const { object } = yield response.json();
            return object;
        });
    }
    createPostResponse(postId, originalPostId, isMainPost = false) {
        const baseUrl = isMainPost
            ? 'https://www.linkedin.com/feed/update/'
            : 'https://www.linkedin.com/embed/feed/update/';
        return {
            status: 'posted',
            postId,
            id: originalPostId,
            releaseURL: `${baseUrl}${postId}`,
        };
    }
    post(id_1, accessToken_1, postDetails_1, integration_1) {
        return __awaiter(this, arguments, void 0, function* (id, accessToken, postDetails, integration, type = 'personal') {
            var _a, _b;
            let processedPostDetails = postDetails;
            const [firstPost] = postDetails;
            // Check if we should convert images to PDF carousel
            if ((_a = firstPost.settings) === null || _a === void 0 ? void 0 : _a.post_as_images_carousel) {
                processedPostDetails = yield this.convertImagesToPdfCarousel(postDetails, firstPost);
            }
            const [processedFirstPost] = processedPostDetails;
            // Process and upload media for the first post only
            const uploadedMedia = yield this.processMediaForPosts([processedFirstPost], accessToken, id, type);
            // Get media IDs for the main post
            const mainPostMediaIds = (uploadedMedia[processedFirstPost.id] || []).filter(Boolean);
            // Create the main LinkedIn post
            const mainPostId = yield this.createMainPost(id, accessToken, processedFirstPost, mainPostMediaIds, type, !!((_b = firstPost.settings) === null || _b === void 0 ? void 0 : _b.post_as_images_carousel));
            // Return response for main post only
            return [this.createPostResponse(mainPostId, processedFirstPost.id, true)];
        });
    }
    comment(id_1, postId_1, lastCommentId_1, accessToken_1, postDetails_1, integration_1) {
        return __awaiter(this, arguments, void 0, function* (id, postId, lastCommentId, accessToken, postDetails, integration, type = 'personal') {
            const [commentPost] = postDetails;
            const commentPostId = yield this.createCommentPost(id, accessToken, commentPost, postId, type);
            return [this.createPostResponse(commentPostId, commentPost.id, false)];
        });
    }
    addComment(integration_1, originalIntegration_1, postId_1, information_1) {
        return __awaiter(this, arguments, void 0, function* (integration, originalIntegration, postId, information, isPersonal = true) {
            return this.comment(integration.internalId, postId, undefined, integration.token, [
                {
                    id: makeId(10),
                    message: information.comment,
                    media: [],
                    settings: {
                        post_as_images_carousel: false,
                    },
                },
            ], integration, isPersonal ? 'personal' : 'company');
        });
    }
    repostPostUsers(integration_1, originalIntegration_1, postId_1, information_1) {
        return __awaiter(this, arguments, void 0, function* (integration, originalIntegration, postId, information, isPersonal = true) {
            yield this.fetch(`https://api.linkedin.com/rest/posts`, {
                body: JSON.stringify({
                    author: (isPersonal ? 'urn:li:person:' : `urn:li:organization:`) +
                        `${integration.internalId}`,
                    commentary: '',
                    visibility: 'PUBLIC',
                    distribution: {
                        feedDistribution: 'MAIN_FEED',
                        targetEntities: [],
                        thirdPartyDistributionChannels: [],
                    },
                    lifecycleState: 'PUBLISHED',
                    isReshareDisabledByAuthor: false,
                    reshareContext: {
                        parent: postId,
                    },
                }),
                method: 'POST',
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${integration.token}`,
                },
            });
        });
    }
    mention(token, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { elements } = yield (yield fetch(`https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=${encodeURIComponent(data.query)}&projection=(elements*(id,localizedName,logoV2(original~:playableStreams)))`, {
                headers: {
                    'X-Restli-Protocol-Version': '2.0.0',
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': '202601',
                    Authorization: `Bearer ${token}`,
                },
            })).json();
            return elements.map((p) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: String(p.id),
                    label: p.localizedName,
                    image: ((_f = (_e = (_d = (_c = (_b = (_a = p.logoV2) === null || _a === void 0 ? void 0 : _a['original~']) === null || _b === void 0 ? void 0 : _b.elements) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.identifiers) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.identifier) ||
                        '',
                });
            });
        });
    }
    mentionFormat(idOrHandle, name) {
        return `@[${name.replace('@', '')}](urn:li:organization:${idOrHandle})`;
    }
};
__decorate([
    PostPlug({
        identifier: 'linkedin-add-comment',
        title: 'Add comments by a different account',
        description: 'Add accounts to comment on your post',
        pickIntegration: ['linkedin', 'linkedin-page'],
        fields: [
            {
                name: 'comment',
                description: 'The comment to add to the post',
                type: 'textarea',
                placeholder: 'Enter your comment here',
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], LinkedinProvider.prototype, "addComment", null);
__decorate([
    PostPlug({
        identifier: 'linkedin-repost-post-users',
        title: 'Add Re-posters',
        description: 'Add accounts to repost your post',
        pickIntegration: ['linkedin', 'linkedin-page'],
        fields: [],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], LinkedinProvider.prototype, "repostPostUsers", null);
LinkedinProvider = __decorate([
    Rules('LinkedIn can have maximum one attachment when selecting video, when choosing a carousel on LinkedIn minimum amount of attachment must be two, and only pictures, if uploading a video, LinkedIn can have only one attachment')
], LinkedinProvider);
export { LinkedinProvider };
//# sourceMappingURL=linkedin.provider.js.map