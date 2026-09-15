import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;
}
