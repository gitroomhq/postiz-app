import { IsDefined, IsEmail, IsString } from 'class-validator';

export class NewsletterDto {
  @IsString()
  @IsDefined()
  @IsEmail()
  email: string;
}
