import { IsDefined, IsEmail, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;
}
