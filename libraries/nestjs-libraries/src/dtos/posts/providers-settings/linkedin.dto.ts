import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class LinkedinDto {
  @IsBoolean()
  @IsOptional()
  post_as_images_carousel: boolean;

  @IsString()
  @IsOptional()
  carousel_name?: string;
}