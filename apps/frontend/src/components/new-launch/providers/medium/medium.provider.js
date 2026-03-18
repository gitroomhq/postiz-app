'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { MediumPublications } from "./medium.publications";
import { MediumTags } from "./medium.tags";
import { MediumSettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/medium.settings.dto";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { Canonical } from "../../../../../../../libraries/react-shared-libraries/src/form/canonical";
const MediumSettings = () => {
    const form = useSettings();
    const { date } = useIntegration();
    return (<>
      <Input label="Title" {...form.register('title')}/>
      <Input label="Subtitle" {...form.register('subtitle')}/>
      <Canonical date={date} label="Canonical Link" {...form.register('canonical')}/>
      <div>
        <MediumPublications {...form.register('publication')}/>
      </div>
      <div>
        <MediumTags label="Topics" {...form.register('tags')}/>
      </div>
    </>);
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: MediumSettings,
    CustomPreviewComponent: undefined, //MediumPreview,
    dto: MediumSettingsDto,
    checkValidity: undefined,
    maximumCharacters: 100000,
});
//# sourceMappingURL=medium.provider.js.map