import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CaptionDto {
  @IsEnum(['generate', 'improve'])
  action!: 'generate' | 'improve';

  @IsString()
  // Trunca defensivamente; o servico tambem trunca antes do LLM
  @MaxLength(20000)
  content!: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  tone?: string;
}
