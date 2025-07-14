import {
  IsIn, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface
} from 'class-validator';
import { VideoAbstract } from '@gitroom/nestjs-libraries/videos/video.interface';

@ValidatorConstraint({ name: 'checkInRuntime', async: false })
export class ValidIn implements ValidatorConstraintInterface {
  private _load() {
    return (Reflect.getMetadata('video', VideoAbstract) || [])
      .filter((f: any) => f.available)
      .map((p: any) => p.identifier);
  }

  validate(text: string, args: ValidationArguments) {
    // Check if the text is in the list of valid video types
    const validTypes = this._load();
    return validTypes.includes(text);
  }

  defaultMessage(args: ValidationArguments) {
    // here you can provide default error message if validation failed
    return 'type must be any of: ' + this._load().join(', ');
  }
}

export class VideoDto {
  @Validate(ValidIn)
  type: string;

  @IsIn(['vertical', 'horizontal'])
  output: 'vertical' | 'horizontal';

  customParams: any;
}
