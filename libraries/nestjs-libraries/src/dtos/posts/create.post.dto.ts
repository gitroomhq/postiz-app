import {
  ArrayMinSize, IsArray, IsDateString, IsDefined, IsOptional, IsString, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DevToSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto';

export class EmptySettings {}
export class Integration {
  @IsDefined()
  @IsString()
  id: string;
}

export class PostContent {
  @IsDefined()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  id: string;
}

export class Post {
  @IsDefined()
  @Type(() => Integration)
  @ValidateNested()
  integration: Integration;

  @IsDefined()
  @ArrayMinSize(1)
  @IsArray()
  @Type(() => PostContent)
  @ValidateNested({ each: true })
  value: PostContent[];

  @Type(() => EmptySettings, {
    keepDiscriminatorProperty: false,
    discriminator: {
      property: '__type',
      subTypes: [{ value: DevToSettingsDto, name: 'devto' }],
    },
  })
  settings: DevToSettingsDto;
}

export class CreatePostDto {
  @IsDefined()
  @IsDateString()
  date: string;

  @IsDefined()
  @Type(() => Post)
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  posts: Post[];
}
