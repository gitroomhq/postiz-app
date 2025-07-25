import { IsNumber, IsString } from 'class-validator';

export class DevToTagsSettingsDto {
  @IsNumber()
  value: number;

  @IsString()
  label: string;
}
