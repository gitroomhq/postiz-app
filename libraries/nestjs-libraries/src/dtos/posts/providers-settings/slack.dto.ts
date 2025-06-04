import { IsDefined, IsString, MinLength } from 'class-validator';

export class SlackDto {
  @MinLength(1)
  @IsDefined()
  @IsString()
  channel: string;
}
