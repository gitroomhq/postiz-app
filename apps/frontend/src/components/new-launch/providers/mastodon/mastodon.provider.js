'use client';
import { PostComment, withProvider, } from "../high.order.provider";
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: null,
    CustomPreviewComponent: undefined,
    dto: undefined,
    checkValidity: undefined,
    maximumCharacters: 500,
});
//# sourceMappingURL=mastodon.provider.js.map