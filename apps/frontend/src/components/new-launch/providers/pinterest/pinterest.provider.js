'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { PinterestBoard } from "./pinterest.board";
import { PinterestSettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/pinterest.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { ColorPicker } from "../../../../../../../libraries/react-shared-libraries/src/form/color.picker";
import { PinterestPreview } from "./pinterest.preview";
const PinterestSettings = () => {
    const { register, control } = useSettings();
    return (<div className="flex flex-col">
      <Input label={'Title'} {...register('title')}/>
      <Input label={'Link'} {...register('link')}/>
      <PinterestBoard {...register('board')}/>
      <ColorPicker label="Select Pin Color" name="dominant_color" enabled={false} canBeCancelled={true}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    comments: false,
    SettingsComponent: PinterestSettings,
    CustomPreviewComponent: PinterestPreview,
    dto: PinterestSettingsDto,
    checkValidity: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* ([firstItem, ...otherItems] = []) {
        var _a, _b, _c, _d;
        const isMp4 = firstItem === null || firstItem === void 0 ? void 0 : firstItem.find((item) => { var _a, _b, _c; return ((_c = (_b = (_a = item === null || item === void 0 ? void 0 : item.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; });
        const isPicture = firstItem === null || firstItem === void 0 ? void 0 : firstItem.find((item) => { var _a, _b, _c; return ((_c = (_b = (_a = item === null || item === void 0 ? void 0 : item.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) === -1; });
        if (((_a = firstItem === null || firstItem === void 0 ? void 0 : firstItem.length) !== null && _a !== void 0 ? _a : 0) === 0) {
            return 'Requires at least one media';
        }
        if (isMp4 && (firstItem === null || firstItem === void 0 ? void 0 : firstItem.length) !== 2 && !isPicture) {
            return 'If posting a video you have to also include a cover image as second media';
        }
        if (isMp4 && ((_b = firstItem === null || firstItem === void 0 ? void 0 : firstItem.length) !== null && _b !== void 0 ? _b : 0) > 2) {
            return 'If posting a video you can only have two media items';
        }
        if (((_c = firstItem === null || firstItem === void 0 ? void 0 : firstItem.length) !== null && _c !== void 0 ? _c : 0) > 1 &&
            (firstItem === null || firstItem === void 0 ? void 0 : firstItem.every((p) => { var _a, _b, _c; return ((_c = (_b = (_a = p === null || p === void 0 ? void 0 : p.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) == -1; }))) {
            const loadAll = (yield Promise.all((_d = firstItem === null || firstItem === void 0 ? void 0 : firstItem.map((p) => {
                return new Promise((resolve, reject) => {
                    const url = new Image();
                    url.onload = function () {
                        // @ts-ignore
                        resolve({ width: this.width, height: this.height });
                    };
                    url.src = p === null || p === void 0 ? void 0 : p.path;
                });
            })) !== null && _d !== void 0 ? _d : []));
            const checkAllTheSameWidthHeight = loadAll === null || loadAll === void 0 ? void 0 : loadAll.every((p, i, arr) => {
                var _a, _b;
                return (p === null || p === void 0 ? void 0 : p.width) === ((_a = arr === null || arr === void 0 ? void 0 : arr[0]) === null || _a === void 0 ? void 0 : _a.width) && (p === null || p === void 0 ? void 0 : p.height) === ((_b = arr === null || arr === void 0 ? void 0 : arr[0]) === null || _b === void 0 ? void 0 : _b.height);
            });
            if (!checkAllTheSameWidthHeight) {
                return 'Requires all images to have the same width and height';
            }
        }
        return true;
    }),
    maximumCharacters: 500,
});
//# sourceMappingURL=pinterest.provider.js.map