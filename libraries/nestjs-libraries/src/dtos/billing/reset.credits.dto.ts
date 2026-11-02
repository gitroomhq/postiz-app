import { IsIn, IsString } from 'class-validator';

export class ResetCreditsDto {
  @IsString()
  @IsIn(['ai_images', 'ai_videos'])
  type: string;
}
