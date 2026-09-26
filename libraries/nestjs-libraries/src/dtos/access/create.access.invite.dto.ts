import { IsEmail, MaxLength } from 'class-validator';

// postmonster: super admin creating an invite without an access request
export class CreateAccessInviteDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}
