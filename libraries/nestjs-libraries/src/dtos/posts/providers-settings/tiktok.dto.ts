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

  @IsIn(['yes', 'no'])
  duet: 'true' | 'false';

  @IsIn(['yes', 'no'])
  stitch: 'true' | 'false';

  @IsIn(['yes', 'no'])
  comment: 'true' | 'false';

  @IsIn(['yes', 'no'])
  autoAddMusic: 'yes' | 'no';

  @IsIn(['yes', 'no'])
  brand_content_toggle: 'true' | 'false';

  @IsIn(['yes', 'no'])
  brand_organic_toggle: 'true' | 'false';

  // @IsIn(['true'])
  // @IsDefined()
  // isValidVideo: boolean;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}
