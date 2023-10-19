import { Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { RedisVotesService } from './redis/redis.votes.service';
import { PosthogService } from './posthog/posthog.service';

@Module({
  controllers: [],
  providers: [RedisService, RedisVotesService, PosthogService],
  get exports() {
    return this.providers;
  }
})
export class NestLibrariesModule {}
