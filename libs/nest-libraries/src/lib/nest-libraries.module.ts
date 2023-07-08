import { Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { RedisVotesService } from './redis/redis.votes.service';

@Module({
  controllers: [],
  providers: [RedisService, RedisVotesService],
  get exports() {
    return this.providers;
  }
})
export class NestLibrariesModule {}
