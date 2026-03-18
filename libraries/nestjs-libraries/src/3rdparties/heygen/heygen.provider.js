import { __awaiter, __decorate, __metadata } from "tslib";
import { ThirdParty, ThirdPartyAbstract, } from "../thirdparty.interface";
import { OpenaiService } from "../../openai/openai.service";
import { timer } from "../../../../helpers/src/utils/timer";
let HeygenProvider = class HeygenProvider extends ThirdPartyAbstract {
    // @ts-ignore
    constructor(_openaiService) {
        super();
        this._openaiService = _openaiService;
    }
    checkConnection(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const list = yield fetch('https://api.heygen.com/v1/user/me', {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'x-api-key': apiKey,
                },
            });
            if (!list.ok) {
                return false;
            }
            const { data } = yield list.json();
            return {
                name: data.first_name + ' ' + data.last_name,
                username: data.username,
                id: data.username,
            };
        });
    }
    generateVoice(apiKey, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                voice: yield this._openaiService.generateVoiceFromText(data.text),
            };
        });
    }
    voices(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { voices }, } = yield (yield fetch('https://api.heygen.com/v2/voices', {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'x-api-key': apiKey,
                },
            })).json();
            return voices.slice(0, 20);
        });
    }
    avatars(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { avatar_group_list }, } = yield (yield fetch('https://api.heygen.com/v2/avatar_group.list?include_public=false', {
                method: 'GET',
                headers: {
                    accept: 'application/json',
                    'x-api-key': apiKey,
                },
            })).json();
            const loadedAvatars = [];
            for (const avatar of avatar_group_list) {
                const { data: { avatar_list }, } = yield (yield fetch(`https://api.heygen.com/v2/avatar_group/${avatar.id}/avatars`, {
                    method: 'GET',
                    headers: {
                        accept: 'application/json',
                        'x-api-key': apiKey,
                    },
                })).json();
                loadedAvatars.push(...avatar_list);
            }
            return loadedAvatars;
        });
    }
    sendData(apiKey, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { video_id }, } = yield (yield fetch(`https://api.heygen.com/v2/video/generate`, {
                method: 'POST',
                body: JSON.stringify({
                    caption: data.captions === 'yes',
                    video_inputs: [
                        Object.assign(Object.assign({}, (data.type === 'avatar'
                            ? {
                                character: {
                                    type: 'avatar',
                                    avatar_id: data.avatar,
                                },
                            }
                            : {
                                character: {
                                    type: 'talking_photo',
                                    talking_photo_id: data.avatar,
                                },
                            })), { voice: {
                                type: 'text',
                                input_text: data.voice,
                                voice_id: data.selectedVoice,
                            } }),
                    ],
                    dimension: data.aspect_ratio === 'story'
                        ? {
                            width: 720,
                            height: 1280,
                        }
                        : {
                            width: 1280,
                            height: 720,
                        },
                }),
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    'x-api-key': apiKey,
                },
            })).json();
            while (true) {
                const { data: { status, video_url }, } = yield (yield fetch(`https://api.heygen.com/v1/video_status.get?video_id=${video_id}`, {
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        'x-api-key': apiKey,
                    },
                })).json();
                if (status === 'completed') {
                    return video_url;
                }
                else if (status === 'failed') {
                    throw new Error('Video generation failed');
                }
                yield timer(3000);
            }
        });
    }
};
HeygenProvider = __decorate([
    ThirdParty({
        identifier: 'heygen',
        title: 'HeyGen',
        description: 'HeyGen is a platform for creating AI-generated avatars videos.',
        position: 'media',
        fields: [],
    }),
    __metadata("design:paramtypes", [OpenaiService])
], HeygenProvider);
export { HeygenProvider };
//# sourceMappingURL=heygen.provider.js.map