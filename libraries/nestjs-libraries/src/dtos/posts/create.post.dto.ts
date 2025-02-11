import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsNumber, IsOptional, IsString, MinLength, ValidateIf, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { AllProvidersSettings } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/all.providers.settings';
import { MediumSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/medium.settings.dto';
import { HashnodeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hashnode.settings.dto';
import { RedditSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/reddit.dto';
import { YoutubeSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/youtube.settings.dto';
import { PinterestSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/pinterest.dto';
import { DribbbleDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dribbble.dto';
import { TikTokDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/tiktok.dto';
import { DiscordDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/discord.dto';
import { SlackDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/slack.dto';
import { LemmySettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/lemmy.dto';

export class EmptySettings {}
export class Integration {
  @IsDefined()
  @IsString()
  id: string;
}

export class PostContent {
  @IsDefined()
  @IsString()
  @MinLength(6)
  content: string;

  @IsOptional()
  @IsString()
  id: string;

  @IsArray()
  @IsOptional()
  @Type(() => MediaDto)
  @ValidateNested({ each: true })
  image: MediaDto[];
}

export class Post {
  @IsDefined()
  @Type(() => Integration)
  @ValidateNested()
  integration: Integration;

  @IsDefined()
  @ArrayMinSize(1)
  @IsArray()
  @Type(() => PostContent)
  @ValidateNested({ each: true })
  value: PostContent[];

  @IsOptional()
  @IsString()
  group: string;

  @ValidateNested()
  @Type(() => EmptySettings, {
    keepDiscriminatorProperty: false,
    discriminator: {
      property: '__type',
      subTypes: [
        { value: DevToSettingsDto, name: 'devto' },
        { value: MediumSettingsDto, name: 'medium' },
        { value: HashnodeSettingsDto, name: 'hashnode' },
        { value: RedditSettingsDto, name: 'reddit' },
        { value: LemmySettingsDto, name: 'lemmy' },
        { value: YoutubeSettingsDto, name: 'youtube' },
        { value: PinterestSettingsDto, name: 'pinterest' },
        { value: DribbbleDto, name: 'dribbble' },
        { value: TikTokDto, name: 'tiktok' },
        { value: DiscordDto, name: 'discord' },
        { value: SlackDto, name: 'slack' },
      ],
    },
  })
  settings: AllProvidersSettings;
}

class Tags {
  @IsDefined()
  @IsString()
  value: string;

  @IsDefined()
  @IsString()
  label: string;
}

export class CreatePostDto {
  @IsDefined()
  @IsIn(['draft', 'schedule', 'now'])
  type: 'draft' | 'schedule' | 'now';

  @IsOptional()
  @IsString()
  order: string;

  @IsDefined()
  @IsBoolean()
  shortLink: boolean;

  @IsOptional()
  @IsNumber()
  inter?: number;

  @IsDefined()
  @IsDateString()
  date: string;

  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  tags: Tags[];

  @ValidateIf((o) => o.type !== 'draft')
  @IsDefined()
  @Type(() => Post)
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  posts: Post[];
}
