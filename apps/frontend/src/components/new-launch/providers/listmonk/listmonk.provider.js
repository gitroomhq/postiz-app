'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { ListmonkDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/listmonk.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useSettings } from "../../../launches/helpers/use.values";
import { SelectList } from "./select.list";
import { SelectTemplates } from "./select.templates";
const SettingsComponent = () => {
    const form = useSettings();
    return (<>
      <Input label="Subject" {...form.register('subject')}/>
      <Input label="Preview" {...form.register('preview')}/>
      <SelectList {...form.register('list')}/>
      <SelectTemplates {...form.register('template')}/>
    </>);
};
export default withProvider({
    postComment: PostComment.POST,
    minimumCharacters: [],
    SettingsComponent: SettingsComponent,
    CustomPreviewComponent: undefined,
    dto: ListmonkDto,
    checkValidity: undefined,
    maximumCharacters: 300000,
});
//# sourceMappingURL=listmonk.provider.js.map