import { IsString, MinLength } from 'class-validator';

export class GetPostsCountDto {
  /**
   * The channel to count for. Counts are per-channel, which is the one thing
   * `GetPostsListDto` cannot express — it filters by customer and state.
   */
  @IsString()
  @MinLength(1)
  integration: string;
}
