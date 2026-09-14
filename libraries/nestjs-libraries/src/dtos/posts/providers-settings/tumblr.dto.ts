import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const optionalUrlRegex =
  /^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/;

export class TumblrDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  title?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.link)
  @Matches(optionalUrlRegex, {
    message: 'Invalid URL',
  })
  link?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.sourceUrl)
  @Matches(optionalUrlRegex, {
    message: 'Invalid URL',
  })
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  tags?: string;
}
