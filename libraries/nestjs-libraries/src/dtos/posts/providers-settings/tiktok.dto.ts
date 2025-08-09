import {
  IsBoolean, ValidateIf, IsIn, IsString, MaxLength, IsOptional
} from 'class-validator';

export class TikTokDto {
  @ValidateIf((p) => p.title)
  @MaxLength(90)
  title: string;

  @IsIn([
    'PUBLIC_TO_EVERYONE',
    'MUTUAL_FOLLOW_FRIENDS',
    'FOLLOWER_OF_CREATOR',
    'SELF_ONLY',
  ])
  @IsString()
  privacy_level:
    | 'PUBLIC_TO_EVERYONE'
    | 'MUTUAL_FOLLOW_FRIENDS'
    | 'FOLLOWER_OF_CREATOR'
    | 'SELF_ONLY';

  @IsBoolean()
  duet: boolean;

  @IsBoolean()
  stitch: boolean;

  @IsBoolean()
  comment: boolean;

  @IsIn(['yes', 'no'])
  autoAddMusic: 'yes' | 'no';

  @IsBoolean()
  brand_content_toggle: boolean;

  @IsBoolean()
  @IsOptional()
  video_made_with_ai: boolean;

  @IsBoolean()
  brand_organic_toggle: boolean;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}
