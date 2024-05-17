import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsNumber,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class InnerPost {
  @IsString()
  @IsDefined()
  post: string;
}

class PostGroup {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InnerPost)
  @IsDefined()
  list: InnerPost[];
}

export class CreateGeneratedPostsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PostGroup)
  @IsDefined()
  posts: PostGroup[];

  @IsNumber()
  @IsDefined()
  week: number;

  @IsNumber()
  @IsDefined()
  year: number;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.url)
  url: string;

  @IsString()
  @IsDefined()
  @ValidateIf((o) => !o.url)
  postId: string;
}
