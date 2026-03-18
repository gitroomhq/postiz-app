'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useSettings } from "../../../launches/helpers/use.values";
import { WordpressPostType } from "./wordpress.post.type";
import { MediaComponent } from "../../../media/media.component";
import { WordpressDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/wordpress.dto";
const WordpressSettings = () => {
    const form = useSettings();
    return (<>
      <Input label="Title" {...form.register('title')}/>
      <WordpressPostType {...form.register('type')}/>
      <MediaComponent label="Cover picture" description="Add a cover picture" {...form.register('main_image')}/>
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: WordpressSettings,
    CustomPreviewComponent: undefined, // WordpressPreview,
    dto: WordpressDto,
    checkValidity: undefined,
    maximumCharacters: 100000,
});
//# sourceMappingURL=wordpress.provider.js.map