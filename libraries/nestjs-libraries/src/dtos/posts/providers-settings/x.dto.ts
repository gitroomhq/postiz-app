import { IsIn, IsOptional, Matches } from 'class-validator';

export class XDto {
  @IsOptional()
  @Matches(/^(https:\/\/x\.com\/i\/communities\/\d+)?$/, {
    message:
      'Invalid X community URL. It should be in the format: https://x.com/i/communities/1493446837214187523',
  })
  community?: string;

  @IsIn(['everyone', 'following', 'mentionedUsers', 'subscribers', 'verified'])
  who_can_reply_post:
    | 'everyone'
    | 'following'
    | 'mentionedUsers'
    | 'subscribers'
    | 'verified';
}
