import { IsDefined, IsString, MinLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class SlackDto {
  @MinLength(1)
  @IsDefined()
  @IsString()
  @JSONSchema({
    description: 'Channel must be an id',
  })
  channel: string;
}
