import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { VIDEO_FONTS, VIDEO_RATIOS } from '@gitroom/nestjs-libraries/videos/video.edit';

export class VideoEditClipDto {
  @IsString()
  mediaId: string;

  @IsNumber()
  @Min(0)
  in: number;

  @IsNumber()
  @Min(0)
  out: number;

  @IsBoolean()
  muted: boolean;
}

export class VideoEditTitleDto {
  @IsString()
  text: string;

  @IsNumber()
  @Min(0)
  start: number;

  @IsNumber()
  @Min(0)
  end: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsIn(VIDEO_FONTS)
  font: string;

  @IsNumber()
  @Min(8)
  @Max(500)
  size: number;

  @IsString()
  color: string;

  @IsIn(['left', 'center', 'right'])
  align: string;
}

export class VideoEditMusicDto {
  @IsString()
  mediaId: string;

  @IsNumber()
  @Min(0)
  in: number;

  @IsNumber()
  @Min(0)
  start: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  volume: number;
}

export class VideoEditDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => VideoEditClipDto)
  clips: VideoEditClipDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => VideoEditTitleDto)
  titles?: VideoEditTitleDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => VideoEditMusicDto)
  music?: VideoEditMusicDto;

  @IsOptional()
  @IsIn(['original', ...VIDEO_RATIOS])
  shape?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  focusX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  focusY?: number;
}
