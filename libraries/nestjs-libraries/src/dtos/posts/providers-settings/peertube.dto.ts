 import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
  MinLength
} from 'class-validator';
import { Transform } from 'class-transformer';

export class PeerTubeDto {
  @IsString()
  @MinLength(3)   // PeerTube's min video title limit
  @MaxLength(120) // PeerTube's max video title limit
  title: string;


  @IsNumber()
  @Min(1)
  channelId: number;


  @IsOptional()
  @IsNumber()
  privacy?: number; // 1 = public, 2 = unlisted, 3 = private


  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value;
    return String(value)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  })
  tags?: string[];


  @IsOptional()
  @IsBoolean()
  nsfw?: boolean;
}
