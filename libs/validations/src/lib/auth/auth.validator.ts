import {IsDefined, IsEmail, IsString, MinLength} from 'class-validator';

export class AuthValidator {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsString()
  @IsDefined()
  @MinLength(3)
  password: string;
}
