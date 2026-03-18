'use client';
import { PostComment, withProvider, } from "../high.order.provider";
export default withProvider({
    postComment: PostComment.COMMENT,
    comments: 'no-media',
    minimumCharacters: [],
    SettingsComponent: undefined,
    CustomPreviewComponent: undefined,
    dto: undefined,
    checkValidity: undefined,
    maximumCharacters: 500,
});
//# sourceMappingURL=kick.provider.js.map