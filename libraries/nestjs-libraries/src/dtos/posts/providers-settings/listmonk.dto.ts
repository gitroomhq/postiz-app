import { IsOptional, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class ListmonkDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  preview: string;

  @IsString()
  @JSONSchema({
    description: 'List must be an id',
  })
  list: string;

  @IsString()
  @IsOptional()
  @JSONSchema({
    description: 'Template must be an id',
  })
  template: string;
}
