'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { MoltbookDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/moltbook.dto";
import { useSettings } from "../../../launches/helpers/use.values";
import { Input } from "../../../../../../../libraries/react-shared-libraries/src/form/input";
import { useT } from "../../../../../../../libraries/react-shared-libraries/src/translation/get.transation.service.client";
const MoltbookSettings = () => {
    const form = useSettings();
    const t = useT();
    return (<div>
      <Input label={t('submolt', 'Submolt')} placeholder="general" {...form.register('submolt')}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: MoltbookSettings,
    CustomPreviewComponent: undefined,
    dto: MoltbookDto,
    maximumCharacters: 300,
});
//# sourceMappingURL=moltbook.provider.js.map