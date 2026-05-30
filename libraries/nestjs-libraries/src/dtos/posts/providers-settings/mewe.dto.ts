import { IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class MeweDto {
  @IsIn(['timeline', 'group'])
  @JSONSchema({
    description: 'Where to post: timeline or group',
  })
  postType: 'timeline' | 'group';

  @ValidateIf((o) => o.postType === 'group')
  @MinLength(1)
  @IsString()
  @JSONSchema({
    description: 'Group must be an id',
  })
  @IsOptional()
  group?: string;
}
