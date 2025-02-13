import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class SignatureDto {
  @IsString()
  @IsDefined()
  content: string;

  @IsBoolean()
  @IsDefined()
  autoAdd: boolean;
}
