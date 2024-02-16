import {ArrayMinSize, IsArray, IsDateString, IsDefined, IsString, ValidateNested} from "class-validator";
import {Type} from "class-transformer";
import {DevToSettingsDto} from "@gitroom/nestjs-libraries/dtos/posts/providers-settings/dev.to.settings.dto";

export class EmptySettings {}
export class Integration {
  @IsDefined()
  @IsString()
  id: string
}

export class Post {
  @IsDefined()
  @Type(() => Integration)
  @ValidateNested()
  integration: Integration;

  @IsDefined()
  @ArrayMinSize(1)
  @IsArray()
  @IsString({ each: true })
  value: string[];

  @Type(() => EmptySettings, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: '__type',
      subTypes: [
        { value: DevToSettingsDto, name: 'devto' },
      ],
    },
  })
  settings: DevToSettingsDto
}

export class CreatePostDto {
  @IsDefined()
  @IsDateString()
  date: string;

  @IsDefined()
  @Type(() => Post)
  @IsArray()
  @ValidateNested({each: true})
  @ArrayMinSize(1)
  posts: Post[]
}
