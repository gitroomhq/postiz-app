import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';

export class Prompt {
  @IsIn(['prompt', 'image'])
  type: 'prompt' | 'image';

  @IsString()
  value: string;
}

export class VideoDto {
  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => Prompt)
  prompt: Prompt[];

  @IsIn(['vertical', 'horizontal'])
  output: 'vertical' | 'horizontal';

  customParams: any;
}
