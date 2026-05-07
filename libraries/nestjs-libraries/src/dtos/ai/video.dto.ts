import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const MODES = ['T2V', 'I2V'] as const;
const ASPECT_RATIOS = ['1:1', '9:16', '16:9'] as const;

/**
 * DTO do endpoint POST /ai/video/generate.
 *
 * - `mode='I2V'` exige `referenceImageUrl` (validado via @ValidateIf + @IsUrl).
 * - `aspectRatio` opcional sobrescreve o default da credencial.
 * - `enrichPrompt` opcional (default true no service): quando true, o prompt
 *   passa pelo TEXT enrich antes de ir pro modelo de video.
 */
export class GenerateVideoBodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  prompt!: string;

  @IsEnum(MODES)
  mode!: 'T2V' | 'I2V';

  @ValidateIf((o) => o.mode === 'I2V')
  @IsUrl({ require_protocol: true })
  referenceImageUrl?: string;

  @IsOptional()
  @IsEnum(ASPECT_RATIOS)
  aspectRatio?: '1:1' | '9:16' | '16:9';

  @IsOptional()
  @IsBoolean()
  enrichPrompt?: boolean;
}
