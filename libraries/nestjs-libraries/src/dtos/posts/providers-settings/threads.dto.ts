import { IsBoolean, IsOptional } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class ThreadsDto {
  @IsOptional()
  @IsBoolean()
  @JSONSchema({
    description:
      'Labels the post as AI generated (Threads shows the "AI info" label). Works for text, image, video and carousel posts.',
  })
  made_with_ai?: boolean;
}
