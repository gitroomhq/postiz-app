'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { FacebookDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/facebook.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useSettings } from "../../../launches/helpers/use.values";
import { FacebookPreview } from "./facebook.preview";
export const FacebookSettings = () => {
    const { register } = useSettings();
    return (<Input label={'Embedded URL (only for text Post)'} {...register('url')}/>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: FacebookSettings,
    CustomPreviewComponent: FacebookPreview,
    dto: FacebookDto,
    checkValidity: undefined,
    maximumCharacters: 63206,
});
//# sourceMappingURL=facebook.provider.js.map