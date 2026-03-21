import { IsEnum } from 'class-validator';
import { ShortLinkPreference } from '@prisma/client';

export class ShortlinkPreferenceDto {
  @IsEnum(ShortLinkPreference)
  shortlink: ShortLinkPreference;
}

