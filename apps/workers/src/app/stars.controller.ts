import {Controller} from '@nestjs/common';
import {EventPattern, Transport} from '@nestjs/microservices';
import { JSDOM } from "jsdom";
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import {TrendingService} from "@gitroom/nestjs-libraries/services/trending.service";

@Controller()
export class StarsController {
  constructor(
      private _starsService: StarsService,
      private _trendingService: TrendingService
  ) {
  }
  @EventPattern('check_stars', Transport.REDIS)
  async checkStars(data: {login: string}) {
    // no to be effected by the limit, we scrape the HTML instead of using the API
    const loadedHtml = await (await fetch(`https://github.com/${data.login}`)).text();
    const dom = new JSDOM(loadedHtml);
    const totalStars = +(
        dom.window.document.querySelector('#repo-stars-counter-star')?.getAttribute('title')?.replace(/,/g, '')
    ) || 0;

    const lastStarsValue = await this._starsService.getLastStarsByLogin(data.login);
    const totalNewsStars = totalStars - (lastStarsValue?.totalStars || 0);

    // if there is no stars in the database, we need to sync the stars
    if (!lastStarsValue?.totalStars) {
      return;
    }

    // if there is stars in the database, sync the new stars
    if (totalNewsStars > 0) {
      return this._starsService.createStars(data.login, totalNewsStars, totalStars, new Date());
    }
  }

  @EventPattern('sync_all_stars', Transport.REDIS, {concurrency: 1})
  async syncAllStars(data: {login: string}) {
    // if there is a sync in progress, it's better not to touch it
    if ((await this._starsService.getStarsByLogin(data.login)).length) {
      return;
    }

    await this._starsService.sync(data.login);
  }

  @EventPattern('sync_trending', Transport.REDIS, {concurrency: 1})
  async syncTrending() {
    return this._trendingService.syncTrending();
  }
}
