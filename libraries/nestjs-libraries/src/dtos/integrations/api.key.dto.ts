import { IsString, MinLength } from 'class-validator';

export class ApiKeyDto {
  @IsString()
  @MinLength(4, {
    message: 'Must be at least 4 characters',
  })
  api: string;
}
