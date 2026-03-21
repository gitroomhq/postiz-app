import { IsDefined, IsEmail, IsString } from 'class-validator';

export class ResendActivationDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;
}

