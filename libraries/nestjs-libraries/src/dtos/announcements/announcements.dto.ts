import { IsDefined, IsIn, IsOptional, IsString } from 'class-validator';

export class AnnouncementDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsDefined()
  description: string;

  @IsOptional()
  @IsString()
  @IsIn(['INFO', 'WARNING', 'ERROR'])
  color?: string;
}
