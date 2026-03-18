'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
import { ThreadFinisher } from "../../finisher/thread.finisher";
const SettingsComponent = () => {
    return <ThreadFinisher />;
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: SettingsComponent,
    CustomPreviewComponent: undefined,
    dto: undefined,
    checkValidity: (posts) => __awaiter(void 0, void 0, void 0, function* () {
        if (posts === null || posts === void 0 ? void 0 : posts.some((p) => { var _a; return (p === null || p === void 0 ? void 0 : p.some((a) => { var _a, _b, _c; return ((_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; })) && ((_a = p === null || p === void 0 ? void 0 : p.length) !== null && _a !== void 0 ? _a : 0) > 1; })) {
            return 'You can only upload one video per post.';
        }
        if (posts === null || posts === void 0 ? void 0 : posts.some((p) => { var _a; return ((_a = p === null || p === void 0 ? void 0 : p.length) !== null && _a !== void 0 ? _a : 0) > 4; })) {
            return 'There can be maximum 4 pictures in a post.';
        }
        return true;
    }),
    maximumCharacters: 300,
});
//# sourceMappingURL=bluesky.provider.js.map