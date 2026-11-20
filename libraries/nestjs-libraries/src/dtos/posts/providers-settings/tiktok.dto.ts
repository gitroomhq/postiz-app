import {
  IsBoolean, ValidateIf, IsIn, IsString, MaxLength, IsOptional, IsDefined, IsNumber, Min, Max, ValidateNested,
  Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments
} from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';

export const TIKTOK_PRIVACY_LEVELS = [
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
] as const;

// TikTok Direct Post UX rules that only depend on the settings themselves
// (https://developers.tiktok.com/doc/content-sharing-guidelines). The rules
// that depend on the creator (allowed privacy options, disabled interactions,
// max video duration) are checked against creator_info at publish time.
@ValidatorConstraint({ name: 'tiktokBrandedContentPrivacy', async: false })
export class TikTokBrandedContentPrivacy implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const o = args.object as TikTokDto;
    return !(o?.brand_content_toggle === true && value === 'SELF_ONLY');
  }
  defaultMessage() {
    return 'Branded content visibility cannot be set to private (Self only)';
  }
}

@ValidatorConstraint({ name: 'tiktokDisclosure', async: false })
export class TikTokDisclosure implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const o = args.object as TikTokDto;
    return !(
      value === true &&
      o?.brand_organic_toggle !== true &&
      o?.brand_content_toggle !== true
    );
  }
  defaultMessage() {
    return 'You need to indicate if your content promotes yourself, a third party, or both';
  }
}

@ValidatorConstraint({ name: 'tiktokMaxDuration', async: false })
export class TikTokMaxDuration implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const o = args.object as TikTokDto;
    if (!o?.max_video_post_duration_sec || !value) {
      return true;
    }
    return Number(value) <= Number(o.max_video_post_duration_sec);
  }
  defaultMessage(args: ValidationArguments) {
    const o = args.object as TikTokDto;
    return `This TikTok account can post videos up to ${o?.max_video_post_duration_sec} seconds, the video is ${Math.ceil(
      Number(args.value)
    )} seconds`;
  }
}

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

// TikTok only honors most of these settings on a DIRECT_POST. With
// content_posting_method=UPLOAD the media lands in the user's TikTok inbox as a
// draft, and TikTok's inbox/upload endpoints accept nothing but the title /
// description - every other field below is silently discarded.
// video_made_with_ai / duet / stitch are additionally video-only: TikTok's photo
// post_info has no is_aigc, disable_duet or disable_stitch field.
// music / location are TikTok Business only: the legacy TikTok provider ignores
// them (its Content Posting API has no music_sound_info / location fields).
// Fields stay required here (existing clients depend on it); the constraints are
// documented, not enforced.
export class TikTokDto {
  @ValidateIf((p) => p.title)
  @MaxLength(90)
  @JSONSchema({
    description:
      'Used as the title of the post. The only setting TikTok keeps when content_posting_method=UPLOAD.',
  })
  title: string;

  // No default: TikTok requires the user to pick the privacy level, from the
  // options creator_info returns for the account. Not needed for UPLOAD.
  @ValidateIf((p) => p.content_posting_method !== 'UPLOAD')
  @IsIn([...TIKTOK_PRIVACY_LEVELS], {
    message:
      'privacy_level is required for a TikTok direct post: choose who can see this video (one of ' +
      TIKTOK_PRIVACY_LEVELS.join(', ') +
      ', and allowed by the account privacy_level_options)',
  })
  @Validate(TikTokBrandedContentPrivacy)
  @JSONSchema({
    description:
      'Required when content_posting_method=DIRECT_POST, there is no default. Must be one of the privacy_level_options TikTok returns for the account (creator_info); the post fails before upload otherwise. Ignored by TikTok on UPLOAD.',
  })
  privacy_level:
    | 'PUBLIC_TO_EVERYONE'
    | 'MUTUAL_FOLLOW_FRIENDS'
    | 'FOLLOWER_OF_CREATOR'
    | 'SELF_ONLY';

  @IsBoolean()
  @JSONSchema({
    description:
      'Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no duet setting for photo posts.',
  })
  duet: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no stitch setting for photo posts.',
  })
  stitch: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  comment: boolean;

  @IsIn(['yes', 'no'])
  @JSONSchema({
    description:
      'Photo posts only, and only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD. ' +
      'On TikTok Business, "yes" attaches a random commercial music library track and overrides the music setting; ' +
      'on legacy TikTok, "yes" lets TikTok auto-add its recommended music.',
  })
  autoAddMusic: 'yes' | 'no';

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  brand_content_toggle: boolean;

  @IsBoolean()
  @IsOptional()
  @JSONSchema({
    description:
      'Labels the post as AI generated. Video posts only, and only when content_posting_method=DIRECT_POST. TikTok has no AI-generated label for photo posts, and discards it on UPLOAD.',
  })
  video_made_with_ai: boolean;

  @IsBoolean()
  @JSONSchema({
    description:
      'Applied only when content_posting_method=DIRECT_POST. Ignored by TikTok on UPLOAD.',
  })
  brand_organic_toggle: boolean;

  @Type(() => TikTokMusic)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only, and only when content_posting_method=DIRECT_POST. Attaches a commercial music library track to the post (use the musicSearch function to find one). audio_volume / video_volume apply to video posts only. For photos, ignored when autoAddMusic is "yes" (a random track is attached instead).',
  })
  music?: TikTokMusic;

  @Type(() => TikTokLocation)
  @ValidateNested()
  @IsOptional()
  @JSONSchema({
    description:
      'TikTok Business only, and only when content_posting_method=DIRECT_POST. Tags the post with a location (use the locationSearch function to find one).',
  })
  location?: TikTokLocation;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  @JSONSchema({
    description:
      'Required. Use "DIRECT_POST" to actually publish the post to TikTok. ' +
      '"UPLOAD" does NOT publish: it only sends the media to the user\'s TikTok app inbox, ' +
      'where they must manually finish and publish it within 24 hours or it is discarded, ' +
      'and it makes TikTok ignore every other setting here. ' +
      'Only use "UPLOAD" when the user explicitly asks to review or edit the post inside the TikTok app before publishing.',
  })
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';

  @IsOptional()
  @IsBoolean()
  @Validate(TikTokDisclosure)
  @JSONSchema({
    description:
      'Commercial content disclosure switch. When true, brand_organic_toggle and/or brand_content_toggle must be true.',
  })
  disclose?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Validate(TikTokMaxDuration)
  @JSONSchema({
    description:
      'Optional. Duration of the video in seconds (set by the dashboard). Checked against max_video_post_duration_sec.',
  })
  video_duration_sec?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @JSONSchema({
    description:
      'Optional. The account max_video_post_duration_sec from creator_info (set by the dashboard).',
  })
  max_video_post_duration_sec?: number;
}
