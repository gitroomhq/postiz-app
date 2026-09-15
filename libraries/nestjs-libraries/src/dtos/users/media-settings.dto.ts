import { IsBoolean } from 'class-validator';

export class MediaSettingsDto {
  @IsBoolean()
  skipMediaRescale: boolean;
}
