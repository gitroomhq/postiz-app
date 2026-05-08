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

const MODES = ['T2I', 'I2I'] as const;
const ASPECT_RATIOS = ['1:1', '9:16', '16:9'] as const;

/**
 * DTO do endpoint POST /media/generate-image-with-prompt.
 *
 * - `mode='I2I'` exige `referenceImageUrl` (validado via @ValidateIf + @IsUrl).
 * - `manualPrompt: true` => o controller passa `skipEnrich: true` para
 *   `MediaService.generateImage`, fazendo o prompt ir cru pro modelo.
 * - `aspectRatio` opcional sobrescreve o default da credencial.
 */
export class GenerateImageBodyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsEnum(MODES)
  mode?: 'T2I' | 'I2I';

  @ValidateIf((o) => o.mode === 'I2I')
  @IsUrl({ require_protocol: true })
  referenceImageUrl?: string;

  @IsOptional()
  @IsEnum(ASPECT_RATIOS)
  aspectRatio?: '1:1' | '9:16' | '16:9';

  @IsOptional()
  @IsBoolean()
  manualPrompt?: boolean;
}
