'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { DevToSettingsDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/dev.to.settings.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { MediaComponent } from "../../../media/media.component";
import { SelectOrganization } from "./select.organization";
import { DevtoTags } from "./devto.tags";
import { Canonical } from "../../../../../../../libraries/react-shared-libraries/src/form/canonical";
import { useIntegration } from "../../../launches/helpers/use.integration";
import { useSettings } from "../../../launches/helpers/use.values";
const DevtoSettings = () => {
    const form = useSettings();
    const { date } = useIntegration();
    return (<>
      <Input label="Title" {...form.register('title')}/>
      <Canonical date={date} label="Canonical Link" {...form.register('canonical')}/>
      <MediaComponent label="Cover picture" description="Add a cover picture" {...form.register('main_image')}/>
      <div className="mt-[20px]">
        <SelectOrganization {...form.register('organization')}/>
      </div>
      <div>
        <DevtoTags label="Tags (Maximum 4)" {...form.register('tags', {
        value: [],
    })}/>
      </div>
    </>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: DevtoSettings,
    CustomPreviewComponent: undefined, // DevtoPreview,
    dto: DevToSettingsDto,
    checkValidity: undefined,
    maximumCharacters: 100000,
});
//# sourceMappingURL=devto.provider.js.map