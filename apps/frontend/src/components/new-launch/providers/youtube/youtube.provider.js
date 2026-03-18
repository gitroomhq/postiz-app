'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { YoutubeSettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/youtube.settings.dto";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { MediumTags } from "../medium/medium.tags";
import { MediaComponent } from "../../../media/media.component";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { YoutubePreview } from "./youtube.preview";
const type = [
    {
        label: 'Public',
        value: 'public',
    },
    {
        label: 'Private',
        value: 'private',
    },
    {
        label: 'Unlisted',
        value: 'unlisted',
    },
];
const madeForKids = [
    {
        label: 'No',
        value: 'no',
    },
    {
        label: 'Yes',
        value: 'yes',
    },
];
const YoutubeSettings = () => {
    const { register, control } = useSettings();
    return (<div className="flex flex-col">
      <Input label="Title" {...register('title')} maxLength={100}/>
      <Select label="Type" {...register('type', {
        value: 'public',
    })}>
        {type.map((t) => (<option key={t.value} value={t.value}>
            {t.label}
          </option>))}
      </Select>
      <Select label="Made for kids" {...register('selfDeclaredMadeForKids', {
        value: 'no',
    })}>
        {madeForKids.map((t) => (<option key={t.value} value={t.value}>
            {t.label}
          </option>))}
      </Select>
      <MediumTags label="Tags" {...register('tags')}/>
      <div className="mt-[20px]">
        <MediaComponent type="image" width={1280} height={720} label="Thumbnail" description="Thumbnail picture (optional)" {...register('thumbnail')}/>
      </div>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    comments: false,
    minimumCharacters: [],
    SettingsComponent: YoutubeSettings,
    CustomPreviewComponent: YoutubePreview,
    dto: YoutubeSettingsDto,
    checkValidity: (items) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const [firstItems] = items !== null && items !== void 0 ? items : [];
        if (((_a = items === null || items === void 0 ? void 0 : items[0]) === null || _a === void 0 ? void 0 : _a.length) !== 1) {
            return 'You need one media';
        }
        if (((_e = (_d = (_c = (_b = firstItems === null || firstItems === void 0 ? void 0 : firstItems[0]) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c.indexOf) === null || _d === void 0 ? void 0 : _d.call(_c, 'mp4')) !== null && _e !== void 0 ? _e : -1) === -1) {
            return 'Item must be a video';
        }
        return true;
    }),
    maximumCharacters: 5000,
});
//# sourceMappingURL=youtube.provider.js.map