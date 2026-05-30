import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

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
}
