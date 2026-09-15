import { IsDefined, IsOptional, IsString } from 'class-validator';

export class TokenExchangeDto {
  @IsString()
  @IsDefined()
  grant_type: string;

  @IsString()
  @IsDefined()
  code: string;

  @IsString()
  @IsDefined()
  client_id: string;

  // Optional to allow PKCE-only public clients (dynamic registration);
  // the service still enforces it for confidential clients
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
