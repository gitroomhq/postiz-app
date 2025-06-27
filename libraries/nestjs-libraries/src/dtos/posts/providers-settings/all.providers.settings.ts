import { DevToSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';
import { MediumSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { HashnodeSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';
import { RedditSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { PinterestSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import { YoutubeSettingsDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { TikTokDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { XDto } from '@chaolaolo/nestjs-libraries/dtos/posts/providers-settings/x.dto';

export type AllProvidersSettings =
  | DevToSettingsDto
  | MediumSettingsDto
  | HashnodeSettingsDto
  | RedditSettingsDto
  | YoutubeSettingsDto
  | PinterestSettingsDto
  | XDto
  | TikTokDto;
