import { IsString } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name: string;

  @IsString()
  color: string;
}
