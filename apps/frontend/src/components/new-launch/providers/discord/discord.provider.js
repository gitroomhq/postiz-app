'use client';
import { PostComment, withProvider, } from "../high.order.provider";
import { DiscordDto } from "../../../../../../../libraries/nestjs-libraries/src/dtos/posts/providers-settings/discord.dto";
import { DiscordChannelSelect } from "./discord.channel.select";
import { useSettings } from "../../../launches/helpers/use.values";
const DiscordComponent = () => {
    const form = useSettings();
    return (<div>
      <DiscordChannelSelect {...form.register('channel')}/>
    </div>);
};
export default withProvider({
    postComment: PostComment.COMMENT,
    minimumCharacters: [],
    SettingsComponent: DiscordComponent,
    CustomPreviewComponent: undefined,
    dto: DiscordDto,
    checkValidity: undefined,
    maximumCharacters: 1980,
});
//# sourceMappingURL=discord.provider.js.map