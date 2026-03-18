'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { MeweDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/mewe.dto";
import { MeweGroupSelect } from "./mewe.group.select";
import { useSettings } from "../../../launches/helpers/use.values";
import { Select } from "../../../../../../../libraries/react-shared-libraries/src/form/select";
import { useWatch } from 'react-hook-form';
const MeweComponent = () => {
    const form = useSettings();
    const postType = useWatch({ control: form.control, name: 'postType' });
    return (<div>
      <Select label="Post To" {...form.register('postType')}>
        <option value="timeline">My Timeline</option>
        <option value="group">Group</option>
      </Select>
      {postType === 'group' && (<MeweGroupSelect {...form.register('group')}/>)}
    </div>);
};
export default withProvider({
    postComment: PostComment.POST,
    comments: false,
    minimumCharacters: [],
    SettingsComponent: MeweComponent,
    CustomPreviewComponent: undefined,
    dto: MeweDto,
    checkValidity: undefined,
    maximumCharacters: 63206,
});
//# sourceMappingURL=mewe.provider.js.map