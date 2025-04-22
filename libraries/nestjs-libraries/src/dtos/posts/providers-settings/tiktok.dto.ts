import { Equals, IsBoolean, IsDefined, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  duet: boolean;

  @IsBoolean()
  stitch: boolean;

  @IsBoolean()
  comment: boolean;

  @IsIn(['yes', 'no'])
  autoAddMusic: 'yes' | 'no';

  @ValidateIf((o) => o.disclose === true && !o.brand_organic_toggle)
  @Equals(true, { message: 'Your brand must be enabled if brand content is not selected' })
  brand_content_toggle = false;

  @ValidateIf((o) => o.disclose === true && !o.brand_content_toggle)
  @Equals(true, { message: 'Branded content must be enabled if brand organic is not selected' })
  brand_organic_toggle = false;

  @IsOptional()
  @IsBoolean()
  disclose = false;

  // @IsIn(['true'])
  // @IsDefined()
  // isValidVideo: boolean;

  @IsIn(['DIRECT_POST', 'UPLOAD'])
  @IsString()
  content_posting_method: 'DIRECT_POST' | 'UPLOAD';
}
