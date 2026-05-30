import { IsDefined, IsString, MinLength } from 'class-validator';

export class MoltbookDto {
  @MinLength(1)
  @IsDefined()
  @IsString()
  submolt: string;
}
