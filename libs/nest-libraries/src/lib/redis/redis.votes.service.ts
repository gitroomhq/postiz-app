import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisVotesService {
  constructor(private readonly _redisService: RedisService) {}

  async userVoted(
    key: string,
    voteId: string,
    voteToId: string,
    userId: string
  ) {
    const value = await this._redisService
      .client()
      .hGet(`vote:${key}:${voteId}:${voteToId}`, userId);
    return Number(value || 0);
  }
  async getRedisTotalVotes(key: string, voteId: string, voteToId: string) {
    const count = await this._redisService
      .client()
      .hGet(`vote:${key}:${voteId}:${voteToId}`, 'count');

    const sum = await this._redisService
      .client()
      .hGet(`vote:${key}:${voteId}:${voteToId}`, 'sum');

    return {
      count: Number(count || 0),
      avg: count ? Math.ceil(Number(sum) / Number(count)) : 0,
    };
  }

  async redisVote(
    key: string,
    voteId: string,
    voteToId: string,
    userId: string,
    type: 'single' | 'range',
    newValue: number
  ) {
    // eslint-disable-next-line prefer-rest-params
    const initial = {
      initial: +(
        (await this._redisService
          .client()
          .hGet(`vote:${key}:${voteId}:${voteToId}`, userId)) || 0
      ),
    };
    if (
      type === 'single' &&
      (newValue === 1 || newValue === -1 || newValue === 0)
    ) {
      await this._redisService.client().executeIsolated(async (client) => {
        await client.watch(`vote:${key}:${voteId}:${voteToId}`);

        const value =
          (await client.hGet(`vote:${key}:${voteId}:${voteToId}`, userId)) ||
          '0';

        if (value === newValue.toString()) {
          return;
        }

        const multi = client.multi();

        if (+value) {
          multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'count', -value);
        }

        multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'count', newValue);
        if (newValue !== 0) {
          multi.hSet(
            `vote:${key}:${voteId}:${voteToId}`,
            userId,
            newValue.toString()
          );
        } else {
          multi.hDel(`vote:${key}:${voteId}:${voteToId}`, userId);
        }

        return multi.exec();
      });
    } else if (type === 'range') {
      await this._redisService.client().executeIsolated(async (client) => {
        await client.watch(`vote:${key}:${voteId}:${voteToId}`);

        const value =
          (await client.hGet(`vote:${key}:${voteId}:${voteToId}`, userId)) ||
          '0';

        if (value === newValue.toString()) {
          return;
        }

        const multi = client.multi();

        // if value is more than zero, in any case we need to remove the previous value
        if (+value > 0) {
          multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'count', -1);
          multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'sum', -value);
        }

        if (newValue > 0) {
          multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'count', 1);
          multi.hIncrBy(`vote:${key}:${voteId}:${voteToId}`, 'sum', newValue);
        }

        multi.hSet(
          `vote:${key}:${voteId}:${voteToId}`,
          userId,
          newValue.toString()
        );
        return multi.exec();
      });
    }

    return {
      ...initial,
      ...(await this.getRedisTotalVotes(key, voteId, voteToId)),
    };
  }
}
