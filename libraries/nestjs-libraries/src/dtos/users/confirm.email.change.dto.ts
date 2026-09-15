import { IsDefined, IsString, MinLength } from 'class-validator';

export class ConfirmEmailChangeDto {
  @IsString()
  @IsDefined()
  @MinLength(5)
  token: string;
}
