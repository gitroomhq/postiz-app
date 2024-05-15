import {
  IsDefined,
  IsInt,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class Date {
  @IsInt()
  week: number;

  @IsInt()
  year: number;
}
export class GeneratorDto {
  @IsDefined()
  @ValidateNested()
  date: Date;

  @IsString()
  @ValidateIf((o) => !o.post)
  @IsUrl(
    {},
    {
      message: 'Invalid URL',
    }
  )
  url: string;

  @ValidateIf((o) => !o.url)
  @IsString()
  post: string;
}
