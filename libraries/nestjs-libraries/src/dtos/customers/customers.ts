import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  orgId: string; // Organization ID is required and must be provided
}
