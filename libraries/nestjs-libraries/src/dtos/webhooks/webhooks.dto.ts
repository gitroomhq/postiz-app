import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class WebhooksIntegrationDto {
  @IsString()
  @IsDefined()
  id: string;
}

export class WebhooksDto {
  id: string;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsUrl()
  @IsDefined()
  url: string;

  @Type(() => WebhooksIntegrationDto)
  @IsDefined()
  integrations: WebhooksIntegrationDto[];
}

export class UpdateDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsUrl()
  @IsDefined()
  url: string;

  @Type(() => WebhooksIntegrationDto)
  @IsDefined()
  integrations: WebhooksIntegrationDto[];
}
