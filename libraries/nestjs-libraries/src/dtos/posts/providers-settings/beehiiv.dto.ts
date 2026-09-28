import {
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';

export class BeehiivDto {
  @IsString()
  @MinLength(1)
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  thumbnail?: MediaDto;

  @IsIn(['draft', 'confirmed'])
  @IsOptional()
  @JSONSchema({
    description:
      'draft (default) creates a draft in beehiiv, confirmed publishes it (beehiiv Max / Enterprise plans only)',
  })
  status?: 'draft' | 'confirmed';
}
