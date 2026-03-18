import { __decorate, __metadata } from "tslib";
import { RedditSettingsDto } from "./reddit.dto";
import { PinterestSettingsDto } from "./pinterest.dto";
import { YoutubeSettingsDto } from "./youtube.settings.dto";
import { TikTokDto } from "./tiktok.dto";
import { XDto } from "./x.dto";
import { LemmySettingsDto } from "./lemmy.dto";
import { DribbbleDto } from "./dribbble.dto";
import { DiscordDto } from "./discord.dto";
import { SlackDto } from "./slack.dto";
import { KickDto } from "./kick.dto";
import { TwitchDto } from "./twitch.dto";
import { InstagramDto } from "./instagram.dto";
import { LinkedinDto } from "./linkedin.dto";
import { IsIn } from 'class-validator';
import { MediumSettingsDto } from "./medium.settings.dto";
import { DevToSettingsDto } from "./dev.to.settings.dto";
import { HashnodeSettingsDto } from "./hashnode.settings.dto";
import { WordpressDto } from "./wordpress.dto";
import { ListmonkDto } from "./listmonk.dto";
import { GmbSettingsDto } from "./gmb.settings.dto";
import { FarcasterDto } from "./farcaster.dto";
import { FacebookDto } from "./facebook.dto";
import { MoltbookDto } from "./moltbook.dto";
import { SkoolDto } from "./skool.dto";
import { WhopDto } from "./whop.dto";
import { MeweDto } from "./mewe.dto";
import { GhostDto } from "./ghost.dto";
export const allProviders = (setEmpty) => {
    return [
        { value: RedditSettingsDto, name: 'reddit' },
        { value: LemmySettingsDto, name: 'lemmy' },
        { value: YoutubeSettingsDto, name: 'youtube' },
        { value: PinterestSettingsDto, name: 'pinterest' },
        { value: DribbbleDto, name: 'dribbble' },
        { value: TikTokDto, name: 'tiktok' },
        { value: DiscordDto, name: 'discord' },
        { value: SlackDto, name: 'slack' },
        { value: KickDto, name: 'kick' },
        { value: TwitchDto, name: 'twitch' },
        { value: XDto, name: 'x' },
        { value: LinkedinDto, name: 'linkedin' },
        { value: LinkedinDto, name: 'linkedin-page' },
        { value: InstagramDto, name: 'instagram' },
        { value: InstagramDto, name: 'instagram-standalone' },
        { value: MediumSettingsDto, name: 'medium' },
        { value: DevToSettingsDto, name: 'devto' },
        { value: WordpressDto, name: 'wordpress' },
        { value: HashnodeSettingsDto, name: 'hashnode' },
        { value: ListmonkDto, name: 'listmonk' },
        { value: GmbSettingsDto, name: 'gmb' },
        { value: FarcasterDto, name: 'wrapcast' },
        { value: FacebookDto, name: 'facebook' },
        { value: setEmpty, name: 'threads' },
        { value: setEmpty, name: 'mastodon' },
        { value: setEmpty, name: 'bluesky' },
        { value: setEmpty, name: 'telegram' },
        { value: setEmpty, name: 'nostr' },
        { value: setEmpty, name: 'vk' },
        { value: MoltbookDto, name: 'moltbook' },
        { value: SkoolDto, name: 'skool' },
        { value: GhostDto, name: 'ghost' },
        { value: WhopDto, name: 'whop' },
        { value: MeweDto, name: 'mewe' },
    ].filter((f) => f.value);
};
export class EmptySettings {
}
__decorate([
    IsIn(allProviders(EmptySettings).map((p) => p.name), {
        message: `"__type" must be ${allProviders(EmptySettings)
            .map((p) => p.name)
            .join(', ')}`,
    }),
    __metadata("design:type", String)
], EmptySettings.prototype, "__type", void 0);
//# sourceMappingURL=all.providers.settings.js.map