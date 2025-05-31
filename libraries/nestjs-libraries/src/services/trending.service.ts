import json from './trending';
import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import { StarsService } from '@gitroom/nestjs-libraries/database/prisma/stars/stars.service';
import md5 from 'md5';

@Injectable()
export class TrendingService {
  constructor(private _starsService: StarsService) {}
  async syncTrending() {
    for (const language of json) {
      const data = await (
        await fetch(`https://github.com/trending/${language.link}`)
      ).text();
      const dom = new JSDOM(data);
      const trending = Array.from(
        dom.window.document.querySelectorAll('[class="Link"]')
      );
      const arr = trending.map((el, index) => {
        return {
          name: el?.textContent?.trim().replace(/\s/g, '') || '',
          position: index + 1,
        };
      });

      const hashedNames = md5(arr.map((p) => p.name).join(''));
      console.log('Updating GitHub trending topic', language, hashedNames);
      await this._starsService.updateTrending(language.name, hashedNames, arr);
    }
  }
}
