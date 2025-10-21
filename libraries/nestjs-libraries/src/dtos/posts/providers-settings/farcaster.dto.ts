import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

export class FarcasterId {
  @IsString()
  id: string;
}
export class FarcasterValue {
  @ValidateNested()
  @Type(() => FarcasterId)
  value: FarcasterId;
}
export class FarcasterDto {
  @ValidateNested({ each: true })
  @Type(() => FarcasterValue)
  subreddit: FarcasterValue[];
}
