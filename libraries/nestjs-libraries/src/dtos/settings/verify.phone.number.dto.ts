import { IsDefined, IsString } from 'class-validator';

export class VerifyPhoneNumberDto {
  @IsDefined()
  @IsString()
  phoneNumber: string;
}
