import { IsDefined, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminGrantCreditsDto {
  @IsDefined()
  @IsInt()
  @Min(0)
  @Max(1000)
  ai_images: number;

  @IsDefined()
  @IsInt()
  @Min(0)
  @Max(1000)
  ai_videos: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  clipping_minutes?: number;
}
