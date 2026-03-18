import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import { BadBody, RefreshToken, SocialAbstract, } from "../social.abstract";
import { BskyAgent, RichText, AtpAgent, } from '@atproto/api';
import dayjs from 'dayjs';
import { AuthService } from "../../../../helpers/src/auth/auth.service";
import sharp from 'sharp';
import { Plug } from "../../../../helpers/src/decorators/plug.decorator";
import { timer } from "../../../../helpers/src/utils/timer";
import axios from 'axios';
import { stripHtmlValidation } from "../../../../helpers/src/utils/strip.html.validation";
import { Rules } from "../../chat/rules.description.decorator";
function reduceImageBySize(url_1) {
    return __awaiter(this, arguments, void 0, function* (url, maxSizeKB = 976) {
        try {
            // Fetch the image from the URL
            const response = yield axios.get(url, { responseType: 'arraybuffer' });
            let imageBuffer = Buffer.from(response.data);
            // Use sharp to get the metadata of the image
            const metadata = yield sharp(imageBuffer).metadata();
            let width = metadata.width;
            let height = metadata.height;
            // Resize iteratively until the size is below the threshold
            while (imageBuffer.length / 1024 > maxSizeKB) {
                width = Math.floor(width * 0.9); // Reduce dimensions by 10%
                height = Math.floor(height * 0.9);
                // Resize the image
                const resizedBuffer = yield sharp(imageBuffer)
                    .resize({ width, height })
                    .toBuffer();
                imageBuffer = resizedBuffer;
                if (width < 10 || height < 10)
                    break; // Prevent overly small dimensions
            }
            return { width, height, buffer: imageBuffer };
        }
        catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    });
}
function uploadVideo(agent, videoPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data: serviceAuth } = yield agent.com.atproto.server.getServiceAuth({
            aud: `did:web:${agent.dispatchUrl.host}`,
            lxm: 'com.atproto.repo.uploadBlob',
            exp: Date.now() / 1000 + 60 * 30, // 30 minutes
        });
        function downloadVideo(url) {
            return __awaiter(this, void 0, void 0, function* () {
                const response = yield fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.statusText}`);
                }
                const arrayBuffer = yield response.arrayBuffer();
                const video = Buffer.from(arrayBuffer);
                const size = video.length;
                return { video, size };
            });
        }
        const video = yield downloadVideo(videoPath);
        console.log('Downloaded video', videoPath, video.size);
        const uploadUrl = new URL('https://video.bsky.app/xrpc/app.bsky.video.uploadVideo');
        uploadUrl.searchParams.append('did', agent.session.did);
        uploadUrl.searchParams.append('name', videoPath.split('/').pop());
        const uploadResponse = yield fetch(uploadUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${serviceAuth.token}`,
                'Content-Type': 'video/mp4',
                'Content-Length': video.size.toString(),
            },
            body: video.video,
        });
        const jobStatus = (yield uploadResponse.json());
        console.log('JobId:', jobStatus.jobId);
        let blob = jobStatus.blob;
        const videoAgent = new AtpAgent({ service: 'https://video.bsky.app' });
        while (!blob) {
            const { data: status } = yield videoAgent.app.bsky.video.getJobStatus({
                jobId: jobStatus.jobId,
            });
            console.log('Status:', status.jobStatus.state, status.jobStatus.progress || '');
            if (status.jobStatus.blob) {
                blob = status.jobStatus.blob;
            }
            if (status.jobStatus.state === 'JOB_STATE_FAILED') {
                throw new BadBody('bluesky', JSON.stringify({}), {}, 'Could not upload video, job failed');
            }
            yield timer(30000);
        }
        console.log('posting video...');
        return {
            $type: 'app.bsky.embed.video',
            video: blob,
        };
    });
}
let BlueskyProvider = class BlueskyProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 2; // Bluesky has moderate rate limits
        this.identifier = 'bluesky';
        this.name = 'Bluesky';
        this.toolTip = "We don’t currently support two-factor authentication. If it’s enabled on Bluesky, you’ll need to disable it.";
        this.isBetweenSteps = false;
        this.scopes = ['write:statuses', 'profile', 'write:media'];
        this.editor = 'normal';
    }
    maxLength() {
        return 300;
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'service',
                    label: 'Service',
                    defaultValue: 'https://bsky.social',
                    validation: `/^(https?:\\/\\/)?((([a-zA-Z0-9\\-_]{1,256}\\.[a-zA-Z]{2,6})|(([0-9]{1,3}\\.){3}[0-9]{1,3}))(:[0-9]{1,5})?)(\\/[^\\s]*)?$/`,
                    type: 'text',
                },
                {
                    key: 'identifier',
                    label: 'Identifier',
                    validation: `/^.+$/`,
                    type: 'text',
                },
                {
                    key: 'password',
                    label: 'Password',
                    validation: `/^.{3,}$/`,
                    type: 'password',
                },
            ];
        });
    }
    refreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                refreshToken: '',
                expiresIn: 0,
                accessToken: '',
                id: '',
                name: '',
                picture: '',
                username: '',
            };
        });
    }
    generateAuthUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            const state = makeId(6);
            return {
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
            try {
                const agent = new BskyAgent({
                    service: body.service,
                });
                const { data: { accessJwt, refreshJwt, handle, did }, } = yield agent.login({
                    identifier: body.identifier,
                    password: body.password,
                });
                const profile = yield agent.getProfile({
                    actor: did,
                });
                return {
                    refreshToken: refreshJwt,
                    expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
                    accessToken: accessJwt,
                    id: did,
                    name: profile.data.displayName,
                    picture: ((_a = profile === null || profile === void 0 ? void 0 : profile.data) === null || _a === void 0 ? void 0 : _a.avatar) || '',
                    username: profile.data.handle,
                };
            }
            catch (e) {
                console.log(e);
                return 'Invalid credentials';
            }
        });
    }
    getAgent(integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const agent = new BskyAgent({
                service: body.service,
            });
            try {
                yield agent.login({
                    identifier: body.identifier,
                    password: body.password,
                });
            }
            catch (err) {
                throw new RefreshToken('bluesky', JSON.stringify(err), {});
            }
            return agent;
        });
    }
    uploadMediaForPost(agent, post) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Separate images and videos
            const imageMedia = ((_a = post.media) === null || _a === void 0 ? void 0 : _a.filter((p) => p.path.indexOf('mp4') === -1)) || [];
            const videoMedia = ((_b = post.media) === null || _b === void 0 ? void 0 : _b.filter((p) => p.path.indexOf('mp4') !== -1)) || [];
            // Upload images
            const images = yield Promise.all(imageMedia.map((p) => __awaiter(this, void 0, void 0, function* () {
                const { buffer, width, height } = yield reduceImageBySize(p.path);
                return {
                    width,
                    height,
                    buffer: yield agent.uploadBlob(new Blob([buffer])),
                };
            })));
            // Upload videos (only one video per post is supported by Bluesky)
            let videoEmbed = null;
            if (videoMedia.length > 0) {
                videoEmbed = yield uploadVideo(agent, videoMedia[0].path);
            }
            // Determine embed based on media types
            let embed = {};
            if (videoEmbed) {
                embed = videoEmbed;
            }
            else if (images.length > 0) {
                embed = {
                    $type: 'app.bsky.embed.images',
                    images: images.map((p, index) => {
                        var _a;
                        return ({
                            alt: ((_a = imageMedia === null || imageMedia === void 0 ? void 0 : imageMedia[index]) === null || _a === void 0 ? void 0 : _a.alt) || '',
                            image: p.buffer.data.blob,
                            aspectRatio: {
                                width: p.width,
                                height: p.height,
                            },
                        });
                    }),
                };
            }
            return { embed, images };
        });
    }
    post(id, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const agent = yield this.getAgent(integration);
            const [firstPost] = postDetails;
            const { embed } = yield this.uploadMediaForPost(agent, firstPost);
            const rt = new RichText({
                text: firstPost.message,
            });
            yield rt.detectFacets(agent);
            // @ts-ignore
            const { cid, uri, commit } = yield agent.post(Object.assign({ text: rt.text, facets: rt.facets, createdAt: new Date().toISOString() }, (Object.keys(embed).length > 0 ? { embed } : {})));
            return [
                {
                    id: firstPost.id,
                    postId: uri,
                    status: 'completed',
                    releaseURL: `https://bsky.app/profile/${id}/post/${uri.split('/').pop()}`,
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            const agent = yield this.getAgent(integration);
            const [commentPost] = postDetails;
            const { embed } = yield this.uploadMediaForPost(agent, commentPost);
            const rt = new RichText({
                text: commentPost.message,
            });
            yield rt.detectFacets(agent);
            // Get the parent post info to get its CID
            const parentUri = lastCommentId || postId;
            // Fetch the parent post to get its CID
            const parentThread = yield agent.getPostThread({
                uri: parentUri,
                depth: 0,
            });
            // @ts-ignore
            const parentCid = (_a = parentThread.data.thread.post) === null || _a === void 0 ? void 0 : _a.cid;
            // @ts-ignore
            const rootUri = ((_e = (_d = (_c = (_b = parentThread.data.thread.post) === null || _b === void 0 ? void 0 : _b.record) === null || _c === void 0 ? void 0 : _c.reply) === null || _d === void 0 ? void 0 : _d.root) === null || _e === void 0 ? void 0 : _e.uri) || postId;
            // @ts-ignore
            const rootCid = ((_j = (_h = (_g = (_f = parentThread.data.thread.post) === null || _f === void 0 ? void 0 : _f.record) === null || _g === void 0 ? void 0 : _g.reply) === null || _h === void 0 ? void 0 : _h.root) === null || _j === void 0 ? void 0 : _j.cid) || parentCid;
            // @ts-ignore
            const { cid, uri, commit } = yield agent.post(Object.assign(Object.assign({ text: rt.text, facets: rt.facets, createdAt: new Date().toISOString() }, (Object.keys(embed).length > 0 ? { embed } : {})), { reply: {
                    root: {
                        uri: rootUri,
                        cid: rootCid,
                    },
                    parent: {
                        uri: parentUri,
                        cid: parentCid,
                    },
                } }));
            return [
                {
                    id: commentPost.id,
                    postId: uri,
                    status: 'completed',
                    releaseURL: `https://bsky.app/profile/${id}/post/${uri.split('/').pop()}`,
                },
            ];
        });
    }
    autoRepostPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const agent = new BskyAgent({
                service: body.service,
            });
            yield agent.login({
                identifier: body.identifier,
                password: body.password,
            });
            const getThread = yield agent.getPostThread({
                uri: id,
                depth: 0,
            });
            // @ts-ignore
            if (((_a = getThread.data.thread.post) === null || _a === void 0 ? void 0 : _a.likeCount) >= +fields.likesAmount) {
                yield timer(2000);
                yield agent.repost(
                // @ts-ignore
                (_b = getThread.data.thread.post) === null || _b === void 0 ? void 0 : _b.uri, 
                // @ts-ignore
                (_c = getThread.data.thread.post) === null || _c === void 0 ? void 0 : _c.cid);
                return true;
            }
            return true;
        });
    }
    autoPlugPost(integration, id, fields) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const agent = new BskyAgent({
                service: body.service,
            });
            yield agent.login({
                identifier: body.identifier,
                password: body.password,
            });
            const getThread = yield agent.getPostThread({
                uri: id,
                depth: 0,
            });
            // @ts-ignore
            if (((_a = getThread.data.thread.post) === null || _a === void 0 ? void 0 : _a.likeCount) >= +fields.likesAmount) {
                yield timer(2000);
                const rt = new RichText({
                    text: stripHtmlValidation('normal', fields.post, true),
                });
                yield agent.post({
                    text: rt.text,
                    facets: rt.facets,
                    createdAt: new Date().toISOString(),
                    reply: {
                        root: {
                            // @ts-ignore
                            uri: (_b = getThread.data.thread.post) === null || _b === void 0 ? void 0 : _b.uri,
                            // @ts-ignore
                            cid: (_c = getThread.data.thread.post) === null || _c === void 0 ? void 0 : _c.cid,
                        },
                        parent: {
                            // @ts-ignore
                            uri: (_d = getThread.data.thread.post) === null || _d === void 0 ? void 0 : _d.uri,
                            // @ts-ignore
                            cid: (_e = getThread.data.thread.post) === null || _e === void 0 ? void 0 : _e.cid,
                        },
                    },
                });
                return true;
            }
            return true;
        });
    }
    mention(token, d, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = JSON.parse(AuthService.fixedDecryption(integration.customInstanceDetails));
            const agent = new BskyAgent({
                service: body.service,
            });
            yield agent.login({
                identifier: body.identifier,
                password: body.password,
            });
            const list = yield agent.searchActors({
                q: d.query,
            });
            return list.data.actors.map((p) => ({
                label: p.displayName,
                id: p.handle,
                image: p.avatar,
            }));
        });
    }
    mentionFormat(idOrHandle, name) {
        return `@${idOrHandle}`;
    }
};
__decorate([
    Plug({
        identifier: 'bluesky-autoRepostPost',
        title: 'Auto Repost Posts',
        description: 'When a post reached a certain number of likes, repost it to increase engagement (1 week old posts)',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BlueskyProvider.prototype, "autoRepostPost", null);
__decorate([
    Plug({
        identifier: 'bluesky-autoPlugPost',
        title: 'Auto plug post',
        description: 'When a post reached a certain number of likes, add another post to it so you followers get a notification about your promotion',
        runEveryMilliseconds: 21600000,
        totalRuns: 3,
        fields: [
            {
                name: 'likesAmount',
                type: 'number',
                placeholder: 'Amount of likes',
                description: 'The amount of likes to trigger the repost',
                validation: /^\d+$/,
            },
            {
                name: 'post',
                type: 'richtext',
                placeholder: 'Post to plug',
                description: 'Message content to plug',
                validation: /^[\s\S]{3,}$/g,
            },
        ],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], BlueskyProvider.prototype, "autoPlugPost", null);
BlueskyProvider = __decorate([
    Rules('Bluesky can have maximum 1 video or 4 pictures in one post, it can also be without attachments')
], BlueskyProvider);
export { BlueskyProvider };
//# sourceMappingURL=bluesky.provider.js.map