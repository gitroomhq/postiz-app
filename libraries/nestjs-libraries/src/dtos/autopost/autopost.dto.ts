import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsSafeWebhookUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';

export class Integrations {
  @IsString()
  @IsDefined()
  id: string;
}

export class AutopostDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  lastUrl: string;

  @IsBoolean()
  @IsDefined()
  onSlot: boolean;

  @IsBoolean()
  @IsDefined()
  syncLast: boolean;

  @IsUrl()
  @IsDefined()
  @IsSafeWebhookUrl({
    message:
      'Autopost URL must be a public HTTPS URL and cannot point to internal network addresses',
  })
  url: string;

  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsBoolean()
  @IsDefined()
  addPicture: boolean;

  @IsBoolean()
  @IsDefined()
  generateContent: boolean;

  @IsArray()
  @Type(() => Integrations)
  @ValidateNested({ each: true })
  integrations: Integrations[];
}
