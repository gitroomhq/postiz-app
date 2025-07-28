import {
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class GetPostsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  customer: string;
}
