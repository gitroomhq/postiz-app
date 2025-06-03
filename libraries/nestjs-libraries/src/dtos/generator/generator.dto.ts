import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';

export class GeneratorDto {
  @IsString()
  @MinLength(10)
  research: string;

  @IsBoolean()
  isPicture: boolean;

  @IsString()
  @IsIn(['one_short', 'one_long', 'thread_short', 'thread_long'])
  format: 'one_short' | 'one_long' | 'thread_short' | 'thread_long';

  @IsString()
  @IsIn(['personal', 'company'])
  tone: 'personal' | 'company';
}
