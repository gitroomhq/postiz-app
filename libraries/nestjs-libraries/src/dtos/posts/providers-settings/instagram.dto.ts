import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class Collaborators {
  @IsDefined()
  @IsString()
  label: string;
}
export class InstagramDto {
  @IsIn(['post', 'story', 'reel'])
  @IsDefined()
  post_type: 'post' | 'story' | 'reel';

  @Type(() => Collaborators)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  collaborators: Collaborators[];

  @ValidateIf((o: InstagramDto) => o.post_type === 'reel')
  @IsUrl()
  @IsOptional()
  cover_url?: string;

  @ValidateIf((o: InstagramDto) => o.post_type === 'reel')
  @IsNumber()
  @IsOptional()
  thumb_offset?: number;
}
