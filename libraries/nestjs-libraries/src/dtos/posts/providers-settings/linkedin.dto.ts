import { IsBoolean, IsOptional } from 'class-validator';

export class LinkedinDto {
  @IsBoolean()
  @IsOptional()
  post_as_images_carousel: boolean;
}