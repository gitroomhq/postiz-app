'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { DribbbleTeams } from "./dribbble.teams";
import { DribbbleDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/dribbble.dto";
const DribbbleSettings = () => {
    const { register, control } = useSettings();
    return (<div className="flex flex-col">
      <Input label={'Title'} {...register('title')}/>
      <DribbbleTeams {...register('team')}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: DribbbleSettings,
    CustomPreviewComponent: undefined,
    dto: DribbbleDto,
    checkValidity: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* ([firstItem, ...otherItems] = []) {
        const isMp4 = firstItem === null || firstItem === void 0 ? void 0 : firstItem.find((item) => { var _a, _b, _c; return ((_c = (_b = (_a = item === null || item === void 0 ? void 0 : item.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; });
        if ((firstItem === null || firstItem === void 0 ? void 0 : firstItem.length) !== 1) {
            return 'Requires one item';
        }
        if (isMp4) {
            return 'Does not support mp4 files';
        }
        const details = yield new Promise((resolve, reject) => {
            var _a;
            const url = new Image();
            url.onload = function () {
                // @ts-ignore
                resolve({ width: this.width, height: this.height });
            };
            url.src = (_a = firstItem === null || firstItem === void 0 ? void 0 : firstItem[0]) === null || _a === void 0 ? void 0 : _a.path;
        });
        if (((details === null || details === void 0 ? void 0 : details.width) === 400 && (details === null || details === void 0 ? void 0 : details.height) === 300) ||
            ((details === null || details === void 0 ? void 0 : details.width) === 800 && (details === null || details === void 0 ? void 0 : details.height) === 600)) {
            return true;
        }
        return 'Invalid image size. Requires 400x300 or 800x600 px images.';
    }),
    maximumCharacters: 40000,
});
//# sourceMappingURL=dribbble.provider.js.map