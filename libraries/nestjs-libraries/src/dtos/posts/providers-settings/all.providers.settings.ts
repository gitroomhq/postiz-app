import { RedditSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { PinterestSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import { YoutubeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { XDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/x.dto';
import { LemmySettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/lemmy.dto';
import { DribbbleDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dribbble.dto';
import { DiscordDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { SlackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/slack.dto';
import { InstagramDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/instagram.dto';
import { LinkedinDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/linkedin.dto';
import { IsIn } from 'class-validator';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';
import { HashnodeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';
import { WordpressDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/wordpress.dto';
import { ListmonkDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/listmonk.dto';

export type ProviderExtension<T extends string, M> = { __type: T } & M;
export type AllProvidersSettings =
  | ProviderExtension<'reddit', RedditSettingsDto>
  | ProviderExtension<'lemmy', LemmySettingsDto>
  | ProviderExtension<'youtube', YoutubeSettingsDto>
  | ProviderExtension<'pinterest', PinterestSettingsDto>
  | ProviderExtension<'dribbble', DribbbleDto>
  | ProviderExtension<'tiktok', TikTokDto>
  | ProviderExtension<'discord', DiscordDto>
  | ProviderExtension<'slack', SlackDto>
  | ProviderExtension<'x', XDto>
  | ProviderExtension<'linkedin', LinkedinDto>
  | ProviderExtension<'linkedin-page', LinkedinDto>
  | ProviderExtension<'instagram', InstagramDto>
  | ProviderExtension<'instagram-standalone', InstagramDto>
  | ProviderExtension<'medium', MediumSettingsDto>
  | ProviderExtension<'devto', DevToSettingsDto>
  | ProviderExtension<'hashnode', HashnodeSettingsDto>
  | ProviderExtension<'wordpress', WordpressDto>
  | ProviderExtension<'listmonk', ListmonkDto>
  | ProviderExtension<'facebook', None>
  | ProviderExtension<'threads', None>
  | ProviderExtension<'mastodon', None>
  | ProviderExtension<'bluesky', None>
  | ProviderExtension<'wrapcast', None>
  | ProviderExtension<'telegram', None>
  | ProviderExtension<'nostr', None>
  | ProviderExtension<'vk', None>;

type None = NonNullable<unknown>;

export const allProviders = (setEmpty?: any) => {
  return [
    { value: RedditSettingsDto, name: 'reddit' },
    { value: LemmySettingsDto, name: 'lemmy' },
    { value: YoutubeSettingsDto, name: 'youtube' },
    { value: PinterestSettingsDto, name: 'pinterest' },
    { value: DribbbleDto, name: 'dribbble' },
    { value: TikTokDto, name: 'tiktok' },
    { value: DiscordDto, name: 'discord' },
    { value: SlackDto, name: 'slack' },
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
    { value: setEmpty, name: 'facebook' },
    { value: setEmpty, name: 'threads' },
    { value: setEmpty, name: 'mastodon' },
    { value: setEmpty, name: 'bluesky' },
    { value: setEmpty, name: 'wrapcast' },
    { value: setEmpty, name: 'telegram' },
    { value: setEmpty, name: 'nostr' },
    { value: setEmpty, name: 'vk' },
  ].filter((f) => f.value);
};

export class EmptySettings {
  @IsIn(allProviders(EmptySettings).map((p) => p.name), {
    message: `"__type" must be ${allProviders(EmptySettings)
      .map((p) => p.name)
      .join(', ')}`,
  })
  __type: string;
}
