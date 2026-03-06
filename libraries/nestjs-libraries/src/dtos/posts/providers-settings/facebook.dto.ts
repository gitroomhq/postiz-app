import { IsOptional, ValidateIf, IsUrl, IsIn } from 'class-validator';

export class FacebookDto {
  @IsIn(['post', 'story'])
  @IsOptional()
  post_type?: 'post' | 'story';
  
  @IsOptional()
  @ValidateIf(p => p.url)
  @IsUrl()
  url?: string;
}
