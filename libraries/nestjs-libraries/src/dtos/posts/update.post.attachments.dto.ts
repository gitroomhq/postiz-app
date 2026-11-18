import { IsArray, IsDefined, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';

export class UpdatePostAttachmentsDto {
  @IsDefined()
  @IsArray()
  @Type(() => MediaDto)
  @ValidateNested({ each: true })
  attachments: MediaDto[];
}
