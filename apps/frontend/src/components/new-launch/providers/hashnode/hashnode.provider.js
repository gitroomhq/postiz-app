'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { HashnodePublications } from "./hashnode.publications";
import { HashnodeTags } from "./hashnode.tags";
import { HashnodeSettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/hashnode.settings.dto";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { MediaComponent } from "../../../media/media.component";
import { Canonical } from "../../../../../../../libraries/react-shared-libraries/src/form/canonical";
const HashnodeSettings = () => {
    const form = useSettings();
    const { date } = useIntegration();
    return (<>
      <Input label="Title" {...form.register('title')}/>
      <Input label="Subtitle" {...form.register('subtitle')}/>
      <Canonical date={date} label="Canonical Link" {...form.register('canonical')}/>
      <MediaComponent label="Cover picture" description="Add a cover picture" {...form.register('main_image')}/>
      <div className="mt-[20px]">
        <HashnodePublications {...form.register('publication')}/>
      </div>
      <div>
        <HashnodeTags label="Tags" {...form.register('tags')}/>
      </div>
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: HashnodeSettings,
    CustomPreviewComponent: undefined, // HashnodePreview,
    dto: HashnodeSettingsDto,
    checkValidity: undefined,
    maximumCharacters: 10000,
});
//# sourceMappingURL=hashnode.provider.js.map