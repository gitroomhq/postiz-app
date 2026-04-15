import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDefined,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsSafeWebhookUrl } from '@gitroom/nestjs-libraries/dtos/webhooks/webhook.url.validator';

export class ImportMediaItemDto {
  @IsString()
  @IsDefined()
  @IsSafeWebhookUrl({
    message:
      'URL must be a public HTTPS URL and cannot point to internal network addresses',
  })
  url: string;

  @IsString()
  @IsDefined()
  name: string;
}

export class ImportMediaDto {
  @ValidateNested({ each: true })
  @Type(() => ImportMediaItemDto)
  @ArrayMinSize(1)
  @IsDefined()
  items: ImportMediaItemDto[];
}
