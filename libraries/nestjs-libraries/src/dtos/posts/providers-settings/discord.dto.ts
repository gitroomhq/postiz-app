import { IsDefined, IsString, MinLength } from 'class-validator';

export class DiscordDto {
  @MinLength(1)
  @IsDefined()
  @IsString()
  channel: string;
}
