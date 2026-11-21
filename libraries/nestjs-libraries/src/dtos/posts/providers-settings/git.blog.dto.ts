import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JSONSchema } from 'class-validator-jsonschema';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';

export class GitBlogDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  @JSONSchema({ description: 'Post title, written to the front matter' })
  title: string;

  @IsOptional()
  @IsString()
  @JSONSchema({ description: 'Optional subtitle, written to the front matter' })
  subtitle?: string;

  @IsOptional()
  @IsString()
  @Matches(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lowercase letters, numbers and dashes',
  })
  @JSONSchema({
    description:
      'File name / URL slug. Leave empty to build it from the title.',
  })
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @JSONSchema({
    description:
      'Category names, exactly as returned by the categoriesList tool',
  })
  categories?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  @JSONSchema({
    description: 'Featured image, committed to the repository media folder',
  })
  main_image?: MediaDto;

  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Commit the post with draft: true so the site does not show it',
  })
  draft?: boolean;
}
