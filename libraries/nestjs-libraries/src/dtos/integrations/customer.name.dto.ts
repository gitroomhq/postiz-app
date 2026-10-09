import { IsString, MinLength } from 'class-validator';

export class CustomerNameDto {
  @IsString()
  @MinLength(1)
  name: string;
}
