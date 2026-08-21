import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class RegisterClientDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { each: true }
  )
  @IsDefined()
  redirect_uris: string[];

  @IsString()
  @IsOptional()
  client_name?: string;

  @IsString()
  @IsOptional()
  client_uri?: string;

  @IsString()
  @IsOptional()
  logo_uri?: string;

  @IsString()
  @IsOptional()
  token_endpoint_auth_method?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  grant_types?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  response_types?: string[];

  @IsString()
  @IsOptional()
  scope?: string;
}
