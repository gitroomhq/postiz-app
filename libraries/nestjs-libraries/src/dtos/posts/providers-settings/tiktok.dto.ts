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

  @IsIn(['true', 'false'])
  duet: 'true' | 'false';

  @IsIn(['true', 'false'])
  stitch: 'true' | 'false';

  @IsIn(['true', 'false'])
  comment: 'true' | 'false';

  @IsIn(['yes', 'no'])
  autoAddMusic: 'yes' | 'no';

  @IsIn(['true', 'false'])
  brand_content_toggle: 'true' | 'false';

  @IsIn(['true', 'false'])
  brand_organic_toggle: 'true' | 'false';

  // @IsIn(['true'])
  // @IsDefined()
  // isValidVideo: boolean;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}
