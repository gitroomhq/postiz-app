import {
  IsArray,
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

// YouTube caps the combined length of all tags at 500 characters.
// Tags containing whitespace are wrapped in quotes by YouTube, which adds
// two extra characters per tag toward that limit.
export const YOUTUBE_TAGS_MAX_LENGTH = 500;

export function getYoutubeTagsLength(tags: YoutubeTagsSettings[]): number {
  return (tags ?? []).reduce((total, tag) => {
    const label = tag?.label ?? '';
    return total + label.length + (/\s/.test(label) ? 2 : 0);
  }, 0);
}

@ValidatorConstraint({ name: 'IsYoutubeTagsLength', async: false })
export class IsYoutubeTagsLengthConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (!Array.isArray(value)) {
      return true;
    }
    return getYoutubeTagsLength(value) <= YOUTUBE_TAGS_MAX_LENGTH;
  }

  defaultMessage(_args: ValidationArguments): string {
    return `The maximum allowed is ${YOUTUBE_TAGS_MAX_LENGTH} characters in total for all tags.`;
  }
}

export function IsYoutubeTagsLength(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsYoutubeTagsLengthConstraint,
    });
  };
}

export class YoutubeTagsSettings {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class YoutubeSettingsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsDefined()
  title: string;

  @IsIn(['public', 'private', 'unlisted'])
  @IsDefined()
  type: string;

  @IsIn(['yes', 'no'])
  @IsOptional()
  selfDeclaredMadeForKids: 'no' | 'yes';

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  thumbnail?: MediaDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @IsYoutubeTagsLength()
  @Type(() => YoutubeTagsSettings)
  tags: YoutubeTagsSettings[];
}
