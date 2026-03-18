'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { Checkbox } from "../../../../../../../libraries/react-shared-libraries/src/form/checkbox";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
import { useSettings } from "../../../launches/helpers/use.values";
import { LinkedinDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/linkedin.dto";
import { LinkedinPreview } from "./linkedin.preview";
const LinkedInSettings = () => {
    const t = useT();
    const { watch, register, formState, control } = useSettings();
    const isCarousel = watch('post_as_images_carousel');
    return (<div className="mb-[20px]">
      <Checkbox variant="hollow" label={t('post_as_images_carousel', 'Post as images carousel')} {...register('post_as_images_carousel', {
        value: false,
    })}/>
      {isCarousel && (<div className="mt-[10px]">
          <Input label={t('carousel_name', 'Carousel slide name')} placeholder="slides" {...register('carousel_name')}/>
        </div>)}
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: LinkedInSettings,
    CustomPreviewComponent: LinkedinPreview,
    dto: LinkedinDto,
    checkValidity: (posts, vals) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const [firstPost, ...restPosts] = posts !== null && posts !== void 0 ? posts : [];
        if ((vals === null || vals === void 0 ? void 0 : vals.post_as_images_carousel) &&
            (((_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.length) !== null && _a !== void 0 ? _a : 0) < 2 ||
                (firstPost === null || firstPost === void 0 ? void 0 : firstPost.some((p) => { var _a, _b, _c; return ((_c = (_b = (_a = p === null || p === void 0 ? void 0 : p.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; })))) {
            return 'Carousel can only be created with 2 or more images and no videos.';
        }
        if (((_b = firstPost === null || firstPost === void 0 ? void 0 : firstPost.length) !== null && _b !== void 0 ? _b : 0) > 1 &&
            (firstPost === null || firstPost === void 0 ? void 0 : firstPost.some((p) => { var _a, _b, _c; return ((_c = (_b = (_a = p === null || p === void 0 ? void 0 : p.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; }))) {
            return 'Can have maximum 1 media when selecting a video.';
        }
        if (restPosts === null || restPosts === void 0 ? void 0 : restPosts.some((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.length) !== null && _a !== void 0 ? _a : 0) > 0; })) {
            return 'Comments can only contain text.';
        }
        return true;
    }),
    maximumCharacters: 3000,
});
//# sourceMappingURL=linkedin.provider.js.map