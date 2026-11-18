import { IsDefined, IsObject } from 'class-validator';

export class UpdatePostSettingsDto {
  @IsDefined()
  @IsObject()
  settings: Record<string, any>;
}
