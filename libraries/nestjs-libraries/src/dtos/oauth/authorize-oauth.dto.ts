import {
  IsDefined,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AuthorizeOAuthQueryDto {
  @IsString()
  @IsDefined()
  client_id: string;

  @IsString()
  @IsDefined()
  @IsIn(['code'])
  response_type: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  // Not validated with IsIn: static clients may send arbitrary values that
  // were always ignored; only dynamic clients get S256 enforced (in the service)
  @IsString()
  @IsOptional()
  code_challenge_method?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  // RFC 8707 resource indicator sent by MCP clients, only used to tell if
  // the connection can be relayed to a self-hosted instance
  @IsString()
  @IsOptional()
  resource?: string;
}

export class ApproveOAuthDto {
  @IsString()
  @IsDefined()
  client_id: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsDefined()
  @IsIn(['approve', 'deny'])
  action: 'approve' | 'deny';

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  // Not validated with IsIn: static clients may send arbitrary values that
  // were always ignored; only dynamic clients get S256 enforced (in the service)
  @IsString()
  @IsOptional()
  code_challenge_method?: string;
}

export class AuthorizeSelfHostedDto {
  @IsString()
  @IsDefined()
  client_id: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  redirect_uri?: string;

  @IsString()
  @IsOptional()
  code_challenge?: string;

  // Not validated with IsIn, same as ApproveOAuthDto
  @IsString()
  @IsOptional()
  code_challenge_method?: string;

  @IsString()
  @IsOptional()
  resource?: string;

  // The instance as the person knows it: its address, its backend address or
  // the MCP URL from Settings > Developers (resolved in McpRelayService)
  @IsString()
  @IsDefined()
  @MaxLength(2048)
  instance_url: string;

  // Optional because the MCP URL from Settings > Developers carries the key
  @IsString()
  @IsOptional()
  @MaxLength(512)
  api_key?: string;

  // Required (in the controller) for clients that read the email from
  // userinfo, like ChatGPT
  @IsEmail()
  @IsOptional()
  email?: string;
}
