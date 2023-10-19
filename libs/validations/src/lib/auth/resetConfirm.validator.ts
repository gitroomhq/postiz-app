import { IsDefined, IsString, IsUUID, MinLength } from 'class-validator';

export class ResetConfirmValidator {
  // Password reset security code / token
  @IsUUID()
  @IsDefined()
  token: string;

  @IsString()
  @IsDefined()
  @MinLength(3)
  password: string;
}