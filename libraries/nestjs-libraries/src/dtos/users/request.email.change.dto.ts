import { IsDefined, IsEmail, IsOptional, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;
}
