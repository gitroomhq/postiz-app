'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { ThreadFinisher } from "../../finisher/thread.finisher";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useSettings } from "../../../launches/helpers/use.values";
import { XDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/x.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
const whoCanReply = [
    {
        label: 'Everyone',
        value: 'everyone',
    },
    {
        label: 'Accounts you follow',
        value: 'following',
    },
    {
        label: 'Mentioned accounts',
        value: 'mentionedUsers',
    },
    {
        label: 'Subscribers',
        value: 'subscribers',
    },
    {
        label: 'Verified accounts',
        value: 'verified',
    },
];
const SettingsComponent = () => {
    const t = useT();
    const { register, watch, setValue } = useSettings();
    return (<>
      <Select label={t('label_who_can_reply_to_this_post', 'Who can reply to this post?')} className="mb-5" hideErrors={true} {...register('who_can_reply_post', {
        value: 'everyone',
    })}>
        {whoCanReply.map((item) => (<option key={item.value} value={item.value}>
            {item.label}
          </option>))}
      </Select>

      <Input label={'Post to a community, URL (Ex: https://x.com/i/communities/1493446837214187523)'} {...register('community')}/>

      <ThreadFinisher />
    </>);
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: SettingsComponent,
    CustomPreviewComponent: undefined,
    dto: XDto,
    checkValidity: (posts, settings, additionalSettings) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        const premium = ((_a = additionalSettings === null || additionalSettings === void 0 ? void 0 : additionalSettings.find((p) => (p === null || p === void 0 ? void 0 : p.title) === 'Verified')) === null || _a === void 0 ? void 0 : _a.value) ||
            false;
        if (posts === null || posts === void 0 ? void 0 : posts.some((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.length) !== null && _a !== void 0 ? _a : 0) > 4; })) {
            return 'There can be maximum 4 pictures in a post.';
        }
        if (posts === null || posts === void 0 ? void 0 : posts.some((p) => { var _a; return (p === null || p === void 0 ? void 0 : p.some((m) => { var _a, _b, _c; return ((_c = (_b = (_a = m === null || m === void 0 ? void 0 : m.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; })) && ((_a = p === null || p === void 0 ? void 0 : p.length) !== null && _a !== void 0 ? _a : 0) > 1; })) {
            return 'There can be maximum 1 video in a post.';
        }
        for (const load of (_b = posts === null || posts === void 0 ? void 0 : posts.flatMap((p) => p === null || p === void 0 ? void 0 : p.flatMap((a) => a === null || a === void 0 ? void 0 : a.path))) !== null && _b !== void 0 ? _b : []) {
            if (((_d = (_c = load === null || load === void 0 ? void 0 : load.indexOf) === null || _c === void 0 ? void 0 : _c.call(load, 'mp4')) !== null && _d !== void 0 ? _d : -1) > -1) {
                const isValid = yield checkVideoDuration(load, premium);
                if (!isValid) {
                    return 'Video duration must be less than or equal to 140 seconds.';
                }
            }
        }
        return true;
    }),
    maximumCharacters: (settings) => {
        var _a;
        if ((_a = settings === null || settings === void 0 ? void 0 : settings[0]) === null || _a === void 0 ? void 0 : _a.value) {
            return 4000;
        }
        return 280;
    },
});
const checkVideoDuration = (url_1, ...args_1) => __awaiter(void 0, [url_1, ...args_1], void 0, function* (url, isPremium = false) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = url;
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            // Check if the duration is less than or equal to 140 seconds
            const duration = video.duration;
            if ((!isPremium && duration <= 140) || isPremium) {
                resolve(true); // Video duration is acceptable
            }
            else {
                resolve(false); // Video duration exceeds 140 seconds
            }
        };
        video.onerror = () => {
            reject(new Error('Failed to load video metadata.'));
        };
    });
});
//# sourceMappingURL=x.provider.js.map