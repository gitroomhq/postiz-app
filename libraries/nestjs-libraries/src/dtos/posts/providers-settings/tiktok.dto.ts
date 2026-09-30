import {
  IsBoolean, ValidateIf, IsIn, IsString, MaxLength, IsOptional, IsDefined, IsNumber, Min, Max, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';

export class TikTokMusic {
  @IsDefined()
  @IsString()
  @JSONSchema({
    description:
      'The commercial music library track id, taken from the "id" returned by the musicSearch function.',
  })
  id: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  audio_volume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  video_volume?: number;
}

export class TikTokLocation {
  @IsDefined()
  @IsString()
  @JSONSchema({
    description:
      'The location tag id, taken from the "id" returned by the locationSearch function.',
  })
  id: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}

// postmonster (PRD 8.2): Direct Post settings only. The "Upload to inbox/draft"
// mode (content_posting_method=UPLOAD, scope video.upload) is intentionally
// gone - it is outside the reviewed scopes (user.info.basic, video.publish).
// title is the photo post title (<= 90); the caption/description itself is the
// post message: <= 2200 for video, <= 4000 for photo (UTF-16 runes).
// privacy_level is required and has no default (TT-05).
// comment/duet/stitch default to off (TT-06); disclose/brand toggles default to
// off (TT-07). duet/stitch are video-only; photo posts only take comments.
// music / location / autoAddMusic are TikTok Business only: the reviewed TikTok
// provider ignores them (its Content Posting API has no music/location fields).
export class TikTokDto {
  @IsOptional()
  @IsString()
  @MaxLength(90, {
    message: 'The title is too long (max 90 characters).',
  })
  @JSONSchema({
    description:
      'Photo posts only: the post title (max 90). Not used for video posts.',
  })
  title: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @JSONSchema({
    description:
      'Video posts only: the video duration in seconds, measured by the editor. ' +
      'Used to revalidate against max_video_post_duration_sec at publish time (TT-03/TT-16).',
  })
  videoDurationSec?: number;

  @IsDefined({ message: 'Please select who can view this post.' })
  @IsIn(
    [
      'PUBLIC_TO_EVERYONE',
      'MUTUAL_FOLLOW_FRIENDS',
      'FOLLOWER_OF_CREATOR',
      'SELF_ONLY',
    ],
    {
      message:
        'Unknown privacy option. Please select who can view this post.',
    }
  )
  @IsString()
  @JSONSchema({
    description:
      'Required, no default. Must be one of the privacy_level_options returned by creator_info/query. ' +
      'Branded content cannot be combined with SELF_ONLY.',
  })
  privacy_level:
    | 'PUBLIC_TO_EVERYONE'
    | 'MUTUAL_FOLLOW_FRIENDS'
    | 'FOLLOWER_OF_CREATOR'
    | 'SELF_ONLY';

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Allow Duet. Video posts only. Defaults to false; TikTok has no duet setting for photo posts.',
  })
  duet?: boolean;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Allow Stitch. Video posts only. Defaults to false; TikTok has no stitch setting for photo posts.',
  })
  stitch?: boolean;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description: 'Allow Comments. Defaults to false.',
  })
  comment?: boolean;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Commercial content disclosure toggle ("Disclose post content"). Off by default; when on, at least one of brand_organic_toggle / brand_content_toggle must be true (TT-07/TT-08).',
  })
  disclose?: boolean;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Branded content: the post promotes another brand or a third party (labeled "Paid partnership"). Cannot be combined with privacy_level=SELF_ONLY.',
  })
  brand_content_toggle?: boolean;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Your brand: the post promotes yourself or your own business (labeled "Promotional content").',
  })
  brand_organic_toggle?: boolean;

  @IsIn(['yes', 'no'])
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business photo posts only: "yes" attaches a random commercial music library track. Ignored by the reviewed TikTok provider.',
  })
  autoAddMusic?: 'yes' | 'no';

  @Type(() => TikTokMusic)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only: attaches a commercial music library track to the post (use the musicSearch function to find one). Ignored by the reviewed TikTok provider.',
  })
  music?: TikTokMusic;

  @Type(() => TikTokLocation)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only: tags the post with a location (use the locationSearch function to find one). Ignored by the reviewed TikTok provider.',
  })
  location?: TikTokLocation;
}
