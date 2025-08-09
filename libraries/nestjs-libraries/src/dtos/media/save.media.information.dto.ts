import { IsNumber, IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

export class SaveMediaInformationDto {
  @IsString()
  id: string;

  @IsString()
  alt: string;

  @IsUrl()
  @ValidateIf((o) => !!o.thumbnail)
  thumbnail: string;

  @IsNumber()
  @ValidateIf((o) => !!o.thumbnailTimestamp)
  thumbnailTimestamp: number;
}
