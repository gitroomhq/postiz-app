import { __awaiter } from "tslib";
import { makeId } from "../../services/make.is";
import dayjs from 'dayjs';
import { SocialAbstract } from "../social.abstract";
import { getPublicKey, Relay, finalizeEvent, SimplePool } from 'nostr-tools';
import WebSocket from 'ws';
import { AuthService } from "../../../../helpers/src/auth/auth.service";
// @ts-ignore
global.WebSocket = WebSocket;
const list = [
    'wss://nos.lol',
    'wss://relay.damus.io',
    'wss://relay.snort.social',
    'wss://temp.iris.to',
    'wss://vault.iris.to',
];
const pool = new SimplePool();
export class NostrProvider extends SocialAbstract {
    constructor() {
        super(...arguments);
        this.maxConcurrentJob = 5;
        this.identifier = 'nostr';
        this.name = 'Nostr';
        this.isBetweenSteps = false;
        this.scopes = [];
        this.editor = 'normal';
        this.toolTip = 'Make sure you private a HEX key of your Nostr private key, you can get it from websites like iris.to';
    }
    maxLength() {
        return 100000;
    }
    customFields() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    key: 'password',
                    label: 'Nostr private key',
                    validation: `/^.{3,}$/`,
                    type: 'password',
                },
            ];
        });
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
                url: state,
                codeVerifier: makeId(10),
                state,
            };
        });
    }
    findRelayInformation(pubkey) {
        return __awaiter(this, void 0, void 0, function* () {
            // This queries ALL relays in parallel and resolves with
            // the first matching event from ANY relay.
            const evt = yield pool.get(list, {
                kinds: [0],
                authors: [pubkey],
                limit: 1,
            });
            if (!evt)
                return {};
            let content = {};
            try {
                content = JSON.parse(evt.content || '{}');
            }
            catch (_a) {
                return {};
            }
            if (content.name || content.displayName || content.display_name) {
                return content;
            }
            return {};
        });
    }
    publish(pubkey, event) {
        return __awaiter(this, void 0, void 0, function* () {
            let id = '';
            for (const relay of list) {
                try {
                    const relayInstance = yield Relay.connect(relay);
                    const value = new Promise((resolve) => {
                        relayInstance.subscribe([{ kinds: [1], authors: [pubkey] }], {
                            eoseTimeout: 6000,
                            onevent: (event) => {
                                resolve(event);
                            },
                            oneose: () => {
                                resolve({});
                            },
                            onclose: () => {
                                resolve({});
                            },
                        });
                    });
                    yield relayInstance.publish(event);
                    const all = yield value;
                    relayInstance.close();
                    // relayInstance.close();
                    id = id || (all === null || all === void 0 ? void 0 : all.id);
                }
                catch (err) {
                    /**empty**/
                }
            }
            return id;
        });
    }
    authenticate(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
                const pubkey = getPublicKey(Uint8Array.from(body.password.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))));
                const user = yield this.findRelayInformation(pubkey);
                return {
                    id: pubkey,
                    name: user.display_name || user.displayName || user.name || 'No Name',
                    accessToken: AuthService.signJWT({ password: body.password }),
                    refreshToken: '',
                    expiresIn: dayjs().add(200, 'year').unix() - dayjs().unix(),
                    picture: (user === null || user === void 0 ? void 0 : user.picture) || '',
                    username: user.name || 'nousername',
                };
            }
            catch (e) {
                console.log(e);
                return 'Invalid credentials';
            }
        });
    }
    buildContent(post) {
        var _a;
        const mediaContent = ((_a = post.media) === null || _a === void 0 ? void 0 : _a.map((m) => m.path).join('\n\n')) || '';
        return mediaContent
            ? `${post.message}\n\n${mediaContent}`
            : post.message;
    }
    post(id, accessToken, postDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            const { password } = AuthService.verifyJWT(accessToken);
            const [firstPost] = postDetails;
            const textEvent = finalizeEvent({
                kind: 1, // Text note
                content: this.buildContent(firstPost),
                tags: [],
                created_at: Math.floor(Date.now() / 1000),
            }, password);
            const eventId = yield this.publish(id, textEvent);
            return [
                {
                    id: firstPost.id,
                    postId: String(eventId),
                    releaseURL: `https://primal.net/e/${eventId}`,
                    status: 'completed',
                },
            ];
        });
    }
    comment(id, postId, lastCommentId, accessToken, postDetails, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            const { password } = AuthService.verifyJWT(accessToken);
            const [commentPost] = postDetails;
            const replyToId = lastCommentId || postId;
            const textEvent = finalizeEvent({
                kind: 1, // Text note
                content: this.buildContent(commentPost),
                tags: [
                    ['e', replyToId, '', 'reply'],
                    ['p', id],
                ],
                created_at: Math.floor(Date.now() / 1000),
            }, password);
            const eventId = yield this.publish(id, textEvent);
            return [
                {
                    id: commentPost.id,
                    postId: String(eventId),
                    releaseURL: `https://primal.net/e/${eventId}`,
                    status: 'completed',
                },
            ];
        });
    }
}
//# sourceMappingURL=nostr.provider.js.map