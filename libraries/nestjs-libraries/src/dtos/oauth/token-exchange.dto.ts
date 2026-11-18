import { IsDefined, IsOptional, IsString, ValidateIf } from 'class-validator';

export class TokenExchangeDto {
  @IsString()
  @IsDefined()
  grant_type: string;

  // The refresh_token grant sends refresh_token instead
  @IsString()
  @IsDefined()
  @ValidateIf((o) => o.grant_type !== 'refresh_token')
  code: string;

  @IsString()
  @IsOptional()
  refresh_token?: string;

  // Optional here because client_secret_basic clients send the id and secret
  // in the Authorization header; the controller merges the two sources and
  // the service rejects a request that ends up without a client_id
  @IsString()
  @IsOptional()
  client_id?: string;

  // Optional to allow PKCE-only public clients (dynamic registration,
  // HubSpot); the service still enforces it for confidential clients
  @IsString()
  @IsOptional()
  client_secret?: string;

  @IsString()
  @IsOptional()
  code_verifier?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;
}
