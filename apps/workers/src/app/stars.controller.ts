import { Controller } from '@nestjs/common';
import { EventPattern, Transport } from '@nestjs/microservices';
import { JSDOM } from 'jsdom';
import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import { TrendingService } from '@gitroom/nestjs-libraries/services/trending.service';
import dayjs from 'dayjs';

@Controller()
export class StarsController {
  constructor(
    private _starsService: StarsService,
    private _trendingService: TrendingService
  ) {}
  @EventPattern('check_stars', Transport.REDIS)
  async checkStars(data: { login: string }) {
    // not to be affected by the limit, we scrape the HTML instead of using the API
    const loadedHtml = await (
      await fetch(`https://github.com/${data.login}`)
    ).text();
    const dom = new JSDOM(loadedHtml);

    const totalStars =
      +dom.window.document
        .querySelector('#repo-stars-counter-star')
        ?.getAttribute('title')
        ?.replace(/,/g, '') || 0;

    const totalForks = +dom.window.document
      .querySelector('#repo-network-counter')
      ?.getAttribute('title')
      ?.replace(/,/g, '');

    const lastValue = await this._starsService.getLastStarsByLogin(data.login);

    if (
      dayjs(lastValue.date).format('YYYY-MM-DD') ===
      dayjs().format('YYYY-MM-DD')
    ) {
      console.log('stars already synced for today');
      return;
    }

    const totalNewsStars = totalStars - (lastValue?.totalStars || 0);
    const totalNewsForks = totalForks - (lastValue?.totalForks || 0);

    // if there is no stars in the database, we need to sync the stars
    if (!lastValue?.totalStars) {
      return;
    }

    // if there is stars in the database, sync the new stars
    return this._starsService.createStars(
      data.login,
      totalNewsStars,
      totalStars,
      totalNewsForks,
      totalForks,
      new Date()
    );
  }

  @EventPattern('sync_all_stars', Transport.REDIS, { concurrency: 1 })
  async syncAllStars(data: { login: string }) {
    // if there is a sync in progress, it's better not to touch it
    if (
      data?.login &&
      (await this._starsService.getStarsByLogin(data?.login)).length
    ) {
      return;
    }

    const findValidToken = await this._starsService.findValidToken(data?.login);
    await this._starsService.sync(data.login, findValidToken?.token);
  }

  @EventPattern('sync_trending', Transport.REDIS, { concurrency: 1 })
  async syncTrending() {
    return this._trendingService.syncTrending();
  }
}
