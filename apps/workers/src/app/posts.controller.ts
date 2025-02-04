import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';

@Controller()
export class PostsController {
  constructor(private _postsService: PostsService) {}
  @EventPattern('post', Transport.REDIS)
  async post(data: { id: string }) {
    console.log('processing', data);
    return this._postsService.post(data.id);
  }

  @EventPattern('submit', Transport.REDIS)
  async payout(data: { id: string; releaseURL: string }) {
    return this._postsService.payout(data.id, data.releaseURL);
  }
}
