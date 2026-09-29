import { IsEmail, IsNotEmpty } from 'class-validator';

// postmonster: account deletion is confirmed by typing the account email (PRD 9)
export class DeleteAccountDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
