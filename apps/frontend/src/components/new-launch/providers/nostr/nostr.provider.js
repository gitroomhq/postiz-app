'use client';
import { __awaiter } from "tslib";
import { PostComment, withProvider, } from "../high.order.provider";
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: null,
    CustomPreviewComponent: undefined,
    dto: undefined,
    checkValidity: () => __awaiter(void 0, void 0, void 0, function* () {
        return true;
    }),
    maximumCharacters: 100000,
});
//# sourceMappingURL=nostr.provider.js.map