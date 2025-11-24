import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PostsService } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.service';
import { BullMqClient } from '@gitroom/nestjs-libraries/bull-mq-transport-new/client';
import dayjs from 'dayjs';

@Injectable()
export class CheckMissingQueues {
  constructor(
    private _postService: PostsService,
    private _workerServiceProducer: BullMqClient
  ) {}
  @Cron('0 * * * *')
  async handleCron() {
    const list = await this._postService.searchForMissingThreeHoursPosts();
    const notExists = (
      await Promise.all(
        list.map(async (p) => ({
          id: p.id,
          publishDate: p.publishDate,
          isJob:
            ['delayed', 'waiting'].indexOf(
              await this._workerServiceProducer
                .getQueue('post')
                .getJobState(p.id)
            ) > -1,
        }))
      )
    ).filter((p) => !p.isJob);


    for (const job of notExists) {
      this._workerServiceProducer.emit('post', {
        id: job.id,
        options: {
          delay: dayjs(job.publishDate).diff(dayjs(), 'millisecond'),
        },
        payload: {
          id: job.id,
          delay: dayjs(job.publishDate).diff(dayjs(), 'millisecond'),
        },
      });
    }
  }
}
