import { IsDefined, IsInt, Max, Min } from 'class-validator';

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
}
