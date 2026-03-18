'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { WhopDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/whop.dto";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useSettings } from "../../../launches/helpers/use.values";
import { WhopCompanySelect } from "./whop.company.select";
import { WhopExperienceSelect } from "./whop.experience.select";
import { useState } from 'react';
const WhopSettings = () => {
    const form = useSettings();
    const [selectedCompany, setSelectedCompany] = useState(form.getValues().company);
    const companyRegister = form.register('company');
    const onCompanyChange = (event) => {
        setSelectedCompany(event.target.value);
        companyRegister.onChange(event);
    };
    return (<div>
      <WhopCompanySelect {...companyRegister} onChange={onCompanyChange}/>
      <WhopExperienceSelect {...form.register('experience')} companyId={selectedCompany}/>
      <Input label="Title (optional)" {...form.register('title')}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: WhopSettings,
    CustomPreviewComponent: undefined,
    dto: WhopDto,
    checkValidity: undefined,
    maximumCharacters: 50000,
});
//# sourceMappingURL=whop.provider.js.map