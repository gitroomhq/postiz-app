import { IsIn, IsString } from 'class-validator';

export class ResetCreditsDto {
  @IsString()
  @IsIn(['ai_images', 'ai_videos', 'clipping_minutes'])
  type: string;
}
