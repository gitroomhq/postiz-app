import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AutomationActionDto {
  @IsString()
  @IsDefined()
  type: string;

  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsDefined()
  variations: string[];
}

export class AutomationDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  platform: string;

  @IsString()
  @IsDefined()
  automationFunction: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @Type(() => AutomationActionDto)
  @ValidateNested({ each: true })
  @ArrayNotEmpty()
  @IsDefined()
  actions: AutomationActionDto[];
}
