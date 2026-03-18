import { __awaiter, __decorate, __metadata } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FarcasterDto } from "../../dtos/posts/providers-settings/farcaster.dto";
import { Tool } from "../tool.decorator";
import { Rules } from "../../chat/rules.description.decorator";
const client = new NeynarAPIClient({
    apiKey: process.env.NEYNAR_SECRET_KEY || '00000000-000-0000-000-000000000000',
});
let FarcasterProvider = class FarcasterProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.identifier = 'wrapcast';
        this.name = 'Farcaster';
        this.isBetweenSteps = false;
        this.isWeb3 = true;
        this.scopes = [];
        this.maxConcurrentJob = 3; // Farcaster has moderate limits
        this.editor = 'normal';
        this.dto = FarcasterDto;
    }
    maxLength() {
        return 800;
    }
    refreshToken(refresh_token) {
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
            const state = makeId(17);
            return {
                url: `${process.env.NEYNAR_CLIENT_ID}||${state}` || '',
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = JSON.parse(Buffer.from(params.code, 'base64').toString());
            return {
                id: String(data.fid),
                name: data.display_name,
                accessToken: data.signer_uuid,
                refreshToken: '',
                expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
                picture: (data === null || data === void 0 ? void 0 : data.pfp_url) || '',
                username: data.username,
            };
        });
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            const [firstPost] = postDetails;
            const ids = [];
            const channels = !((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _a === void 0 ? void 0 : _a.subreddit) ||
                ((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _b === void 0 ? void 0 : _b.subreddit.length) === 0
                ? [undefined]
                : (_c = firstPost === null || firstPost === void 0 ? void 0 : firstPost.settings) === null || _c === void 0 ? void 0 : _c.subreddit;
            for (const channel of channels) {
                const data = yield client.publishCast(Object.assign({ embeds: ((_d = firstPost === null || firstPost === void 0 ? void 0 : firstPost.media) === null || _d === void 0 ? void 0 : _d.map((media) => ({
                        url: media.path,
                    }))) || [], signerUuid: accessToken, text: firstPost.message }, (((_e = channel === null || channel === void 0 ? void 0 : channel.value) === null || _e === void 0 ? void 0 : _e.id) ? { channelId: (_f = channel === null || channel === void 0 ? void 0 : channel.value) === null || _f === void 0 ? void 0 : _f.id } : {})));
                ids.push({
                    // @ts-ignore
                    releaseURL: `https://warpcast.com/${data.cast.author.username}/${data.cast.hash}`,
                    postId: data.cast.hash,
                });
            }
            return [
                {
                    id: firstPost.id,
                    postId: ids.map((p) => p.postId).join(','),
                    releaseURL: ids.map((p) => p.releaseURL).join(','),
                    status: 'published',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const [commentPost] = postDetails;
            const ids = [];
            // postId can be comma-separated if posted to multiple channels
            const parentIds = (lastCommentId || postId).split(',');
            for (const parentHash of parentIds) {
                const data = yield client.publishCast({
                    embeds: ((_a = commentPost === null || commentPost === void 0 ? void 0 : commentPost.media) === null || _a === void 0 ? void 0 : _a.map((media) => ({
                        url: media.path,
                    }))) || [],
                    signerUuid: accessToken,
                    text: commentPost.message,
                    parent: parentHash,
                });
                ids.push({
                    // @ts-ignore
                    releaseURL: `https://warpcast.com/${data.cast.author.username}/${data.cast.hash}`,
                    postId: data.cast.hash,
                });
            }
            return [
                {
                    id: commentPost.id,
                    postId: ids.map((p) => p.postId).join(','),
                    releaseURL: ids.map((p) => p.releaseURL).join(','),
                    status: 'published',
                },
            ];
        });
    }
    subreddits(accessToken, data, id, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const search = yield client.searchChannels({
                q: data.word,
                limit: 10,
            });
            return search.channels.map((p) => {
                return {
                    title: p.name,
                    name: p.name,
                    id: p.id,
                };
            });
        });
    }
};
__decorate([
    Tool({
        description: 'Search channels',
        dataSchema: [{ key: 'word', type: 'string', description: 'Search word' }],
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], FarcasterProvider.prototype, "subreddits", null);
FarcasterProvider = __decorate([
    Rules('Farcaster/Warpcast can only accept pictures')
], FarcasterProvider);
export { FarcasterProvider };
//# sourceMappingURL=farcaster.provider.js.map