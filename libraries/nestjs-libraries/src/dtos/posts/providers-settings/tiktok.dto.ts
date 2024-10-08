import { IsBoolean, IsDefined, IsIn, IsString } from 'class-validator';

export class TikTokDto {
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
  disable_duet: boolean;

  @IsBoolean()
  disable_stitch: boolean;

  @IsBoolean()
  disable_comment: boolean;

  @IsBoolean()
  brand_content_toggle: boolean;

  @IsBoolean()
  brand_organic_toggle: boolean;

  @IsIn(['true'])
  @IsDefined()
  isValidVideo: boolean;
}
