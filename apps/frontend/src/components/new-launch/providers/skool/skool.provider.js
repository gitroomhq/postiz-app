'use client';
import { PostComment, withProvider } from "../high.order.provider";
import { useState } from 'react';
import { SkoolDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/skool.dto";
import { SkoolGroupSelect } from "./skool.group.select";
import { SkoolLabelSelect } from "./skool.label.select";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
const SkoolComponent = () => {
    const form = useSettings();
    const [selectedGroup, setSelectedGroup] = useState(form.getValues().group);
    const groupRegister = form.register('group');
    const onGroupChange = (event) => {
        setSelectedGroup(event.target.value);
        groupRegister.onChange(event);
    };
    return (<div>
      <Input label="Title" {...form.register('title')}/>
      <SkoolGroupSelect {...groupRegister} onChange={onGroupChange}/>
      <SkoolLabelSelect {...form.register('label')} groupId={selectedGroup}/>
    </div>);
};
export default withProvider({
    minimumCharacters: [],
    SettingsComponent: SkoolComponent,
    CustomPreviewComponent: undefined,
    dto: SkoolDto,
    checkValidity: undefined,
    maximumCharacters: 50000,
    postComment: PostComment.ALL,
});
//# sourceMappingURL=skool.provider.js.map