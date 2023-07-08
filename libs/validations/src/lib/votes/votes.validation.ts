import {
  IsDefined,
  IsIn,
  IsNumber,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsBiggerThan } from '../validations/is.bigger.than';
import { IsSmallerThan } from '../validations/is.smaller.than';

export class VotesValidation {
  @IsDefined()
  @IsString()
  @MinLength(2)
  name: string;

  @IsDefined()
  @IsString()
  @IsIn(['single', 'range'])
  type: string;

  @IsDefined()
  @IsNumber(
    {},
    {
      message: 'Minimum is 0',
    }
  )
  @IsSmallerThan('end', {
    message: 'Range to must be smaller than range from',
  })
  @ValidateIf((o) => o.type === 'range')
  start: number;

  @IsDefined()
  @IsNumber(
    {},
    {
      message: 'Minimum is 0',
    }
  )
  @ValidateIf((o) => o.type === 'range')
  @IsBiggerThan('start', {
    message: 'Range to must be bigger than range from',
  })
  end: number;
}
