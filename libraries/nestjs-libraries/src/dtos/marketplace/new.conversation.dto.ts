import { IsString, MinLength } from 'class-validator';

export class NewConversationDto {
  @IsString()
  to: string;

  @IsString()
  @MinLength(50)
  message: string;
}
