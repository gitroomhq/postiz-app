import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import {
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class UserDetailDto {
  @IsString()
  @MinLength(3)
  fullname: string;

  @IsString()
  @IsOptional()
  bio: string;

  @IsOptional()
  @ValidateNested()
  picture: MediaDto;
}
