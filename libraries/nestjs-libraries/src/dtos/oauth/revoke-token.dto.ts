import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
