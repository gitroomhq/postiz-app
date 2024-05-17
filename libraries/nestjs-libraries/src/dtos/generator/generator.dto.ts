import {
  IsDefined,
  IsInt,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class GeneratorDto {
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
