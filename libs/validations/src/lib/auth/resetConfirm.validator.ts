import { IsDefined, IsOptional, IsString, MinLength } from 'class-validator';

export class ResetConfirmValidator {
  // Password reset security code / token
  @IsString()
  @IsOptional()
  token: string;

  @IsString()
  @IsDefined()
  @MinLength(3)
  password: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  confirm_password: string;
}