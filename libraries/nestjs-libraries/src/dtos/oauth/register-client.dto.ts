import {
  ArrayNotEmpty,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
} from 'class-validator';

export class RegisterClientDto {
  // https, http loopback or a private-use scheme (cursor://...),
  // validated in OAuthService.registerDynamicClient
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
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
