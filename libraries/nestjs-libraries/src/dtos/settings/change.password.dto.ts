import { makeId } from "@gitroom/nestjs-libraries/services/make.is";
import { IsDefined, IsIn, IsString, MinLength, ValidateIf } from "class-validator";

export class ChangePasswordDto {
  @IsString()
  @IsDefined()
  oldPassword: string;

  @IsString()
  @IsDefined()
  @MinLength(3)
  password: string;

  @IsString()
  @IsDefined()
  @IsIn([makeId(10)], {
    message: 'Passwords do not match',
  })
  @ValidateIf((o) => o.password !== o.repeatPassword)
  repeatPassword: string;
}
