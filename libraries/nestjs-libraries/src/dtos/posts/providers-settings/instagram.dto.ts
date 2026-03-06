import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class Collaborators {
  @IsDefined()
  @IsString()
  label: string;
}

export class UserTag {
  @IsDefined()
  @IsString()
  label: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  y?: number;
}

export class UserTagsForImage {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserTag)
  @IsOptional()
  tags?: UserTag[];
}

export class InstagramDto {
  @IsIn(['post', 'story'])
  @IsDefined()
  post_type: 'post' | 'story';

  @IsOptional()
  is_trial_reel?: boolean;

  @IsIn(['MANUAL', 'SS_PERFORMANCE'])
  @IsOptional()
  graduation_strategy?: 'MANUAL' | 'SS_PERFORMANCE';

  @Type(() => Collaborators)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  collaborators: Collaborators[];

  @Type(() => UserTagsForImage)
  @ValidateNested({ each: true })
  @IsArray()
  @IsOptional()
  user_tags: UserTagsForImage[];
}
