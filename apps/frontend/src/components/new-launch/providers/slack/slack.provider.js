'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { useSettings } from "../../../launches/helpers/use.values";
import { SlackChannelSelect } from "./slack.channel.select";
import { SlackDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/slack.dto";
const SlackComponent = () => {
    const form = useSettings();
    return (<div>
      <SlackChannelSelect {...form.register('channel')}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: SlackComponent,
    CustomPreviewComponent: undefined,
    dto: SlackDto,
    checkValidity: undefined,
    maximumCharacters: 400000,
});
//# sourceMappingURL=slack.provider.js.map