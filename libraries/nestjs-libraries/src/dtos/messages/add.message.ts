import { IsString, MinLength } from 'class-validator';

export class AddMessageDto {
  @IsString()
  @MinLength(3)
  message: string;
}
