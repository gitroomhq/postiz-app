import {Controller} from '@nestjs/common';
import {EventPattern, Transport} from '@nestjs/microservices';
import {PostsService} from "@gitroom/nestjs-libraries/database/prisma/posts/posts.service";

@Controller()
export class PostsController {
  constructor(
    private _postsService: PostsService
  ) {
  }
  @EventPattern('post', Transport.REDIS)
  async checkStars(data: {id: string}) {
    return this._postsService.post(data.id);
  }
}
