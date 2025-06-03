import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class Collaborators {
  @IsDefined()
  @IsString()
  label: string;
}
export class InstagramDto {
  @IsIn(['post', 'story'])
  @IsDefined()
  post_type: 'post' | 'story';

  @Type(() => Collaborators)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  collaborators: Collaborators[];
}
