import { IsIn, IsOptional } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

export class TelegramDto {
  @IsOptional()
  @IsIn(['top', 'bottom'])
  @JSONSchema({
    description:
      'Where the media goes in a post with photos or videos: top = the media first and the text under it (the Telegram default), bottom = the text first and the media under it. A file sent as a document always comes first',
  })
  media_position?: 'top' | 'bottom';
}
