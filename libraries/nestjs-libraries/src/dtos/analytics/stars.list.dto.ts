import { IsDefined, IsIn, IsNumber, IsOptional } from 'class-validator';

export class StarsListDto {
  @IsNumber()
  @IsDefined()
  page: number;

  @IsOptional()
  @IsIn(['login', 'totalStars', 'stars', 'date', 'forks', 'totalForks'])
  key: 'login' | 'date' | 'stars' | 'totalStars';

  @IsOptional()
  @IsIn(['desc', 'asc'])
  state: 'desc' | 'asc';
}
