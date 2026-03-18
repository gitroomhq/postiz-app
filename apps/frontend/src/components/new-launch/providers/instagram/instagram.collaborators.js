'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { Checkbox } from "../../../../../../../libraries/react-shared-libraries/src/form/checkbox";
import { useSettings } from "../../../launches/helpers/use.values";
import { InstagramDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/instagram.dto";
import { InstagramCollaboratorsTags } from "./instagram.tags";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { InstagramPreview } from "./instagram.preview";
const postType = [
    {
        value: 'post',
        label: 'Post / Reel',
    },
    {
        value: 'story',
        label: 'Story',
    },
];
const graduationStrategies = [
    {
        value: 'MANUAL',
        label: 'Manual',
    },
    {
        value: 'SS_PERFORMANCE',
        label: 'Auto (based on performance)',
    },
];
const InstagramCollaborators = (props) => {
    const t = useT();
    const { watch, register, formState, control } = useSettings();
    const postCurrentType = watch('post_type');
    const isTrialReel = watch('is_trial_reel');
    return (<>
      <Select label="Post Type" {...register('post_type', {
        value: 'post',
    })}>
        <option value="">{t('select_post_type', 'Select Post Type...')}</option>
        {postType.map((item) => (<option key={item.value} value={item.value}>
            {item.label}
          </option>))}
      </Select>

      {postCurrentType !== 'story' && (<InstagramCollaboratorsTags label="Collaborators (max 3) - accounts can't be private" {...register('collaborators', {
            value: [],
        })}/>)}

      {postCurrentType === 'post' && (<div className="mt-[18px] flex flex-col gap-[18px]">
          <Checkbox {...register('is_trial_reel', {
            value: false,
        })} label={t('trial_reel', 'Trial Reel (share only to non-followers first)')}/>

          {isTrialReel && (<Select label="Graduation Strategy" {...register('graduation_strategy', {
                value: 'MANUAL',
            })}>
              {graduationStrategies.map((item) => (<option key={item.value} value={item.value}>
                  {item.label}
                </option>))}
            </Select>)}
        </div>)}
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: InstagramCollaborators,
    CustomPreviewComponent: InstagramPreview,
    dto: InstagramDto,
    checkValidity: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* ([firstPost, ...otherPosts] = [], settings) {
        var _a, _b, _c, _d;
        if (!(firstPost === null || firstPost === void 0 ? void 0 : firstPost.length)) {
            return 'Should have at least one media';
        }
        if (settings === null || settings === void 0 ? void 0 : settings.is_trial_reel) {
            if (((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.length) !== null && _a !== void 0 ? _a : 0) > 1) {
                return 'Trial Reels can only have one video';
            }
            const hasVideo = firstPost === null || firstPost === void 0 ? void 0 : firstPost.some((f) => { var _a, _b, _c; return ((_c = (_b = (_a = f === null || f === void 0 ? void 0 : f.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; });
            if (!hasVideo) {
                return 'Trial Reels must be a video';
            }
        }
        const checkVideosLength = yield Promise.all((_d = (_c = (_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.filter((f) => { var _a, _b, _c; return ((_c = (_b = (_a = f === null || f === void 0 ? void 0 : f.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; })) === null || _b === void 0 ? void 0 : _b.flatMap((p) => p === null || p === void 0 ? void 0 : p.path)) === null || _c === void 0 ? void 0 : _c.map((p) => {
            return new Promise((res) => {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.src = p;
                video.addEventListener('loadedmetadata', () => {
                    res(video.duration);
                });
            });
        })) !== null && _d !== void 0 ? _d : []);
        for (const video of checkVideosLength) {
            if (video > 60 && (settings === null || settings === void 0 ? void 0 : settings.post_type) === 'story') {
                return 'Stories should be maximum 60 seconds';
            }
            if (video > 180 && (settings === null || settings === void 0 ? void 0 : settings.post_type) === 'post') {
                return 'Reel should be maximum 180 seconds';
            }
        }
        return true;
    }),
    maximumCharacters: 2200,
    comments: 'no-media'
});
//# sourceMappingURL=instagram.collaborators.js.map