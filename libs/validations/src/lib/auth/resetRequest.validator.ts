import { IsDefined, IsEmail } from 'class-validator';

export class ResetRequestValidator {
  @IsEmail()
  @IsDefined()
  email: string;
}