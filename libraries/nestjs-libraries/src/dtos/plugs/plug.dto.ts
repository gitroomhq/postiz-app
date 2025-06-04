import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldsDto {
  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  value: string;
}

export class PlugDto {
  @IsString()
  @IsDefined()
  func: string;

  @Type(() => FieldsDto)
  @ValidateNested({ each: true })
  @IsDefined()
  fields: FieldsDto[];
}
