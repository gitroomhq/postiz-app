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
    checkValidity: (...args_1) => __awaiter(void 0, [...args_1], void 0, function* ([firstPost, ...otherPosts] = [], settings) {
        var _a, _b, _c;
        const checkVideosLength = yield Promise.all((_c = (_b = (_a = firstPost === null || firstPost === void 0 ? void 0 : firstPost.filter((f) => { var _a, _b, _c; return ((_c = (_b = (_a = f === null || f === void 0 ? void 0 : f.path) === null || _a === void 0 ? void 0 : _a.indexOf) === null || _b === void 0 ? void 0 : _b.call(_a, 'mp4')) !== null && _c !== void 0 ? _c : -1) > -1; })) === null || _a === void 0 ? void 0 : _a.flatMap((p) => p === null || p === void 0 ? void 0 : p.path)) === null || _b === void 0 ? void 0 : _b.map((p) => {
            return new Promise((res) => {
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.src = p;
                video.addEventListener('loadedmetadata', () => {
                    res(video.duration);
                });
            });
        })) !== null && _c !== void 0 ? _c : []);
        for (const video of checkVideosLength) {
            if (video > 300) {
                return 'Video should be maximum 300 seconds (5 minutes)';
            }
        }
        return true;
    }),
    maximumCharacters: 500,
});
//# sourceMappingURL=threads.provider.js.map