import { IsBoolean, IsIn, IsString } from 'class-validator';
import { allTagsOptions } from '@gitroom/nestjs-libraries/database/prisma/marketplace/tags.list';

export class AddRemoveItemDto {
  @IsString()
  @IsIn(allTagsOptions.map((p) => p.key))
  key: string;

  @IsBoolean()
  state: boolean;
}
