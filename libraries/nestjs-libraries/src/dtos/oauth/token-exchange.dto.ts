import { IsDefined, IsString } from 'class-validator';

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

  @IsString()
  @IsDefined()
  client_secret: string;
}
