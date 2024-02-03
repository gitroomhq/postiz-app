import {Controller} from '@nestjs/common';
import {EventPattern, Transport} from '@nestjs/microservices';
import { JSDOM } from "jsdom";

@Controller()
export class StarsController {
  @EventPattern('check_stars', Transport.REDIS)
  async handleData(data: {id: string, login: string}) {
    const loadedHtml = await (await fetch(`https://github.com/${data.login}`)).text();
    const dom = new JSDOM(loadedHtml);
    const totalStars = +(
        dom.window.document.querySelector('#repo-stars-counter-star')?.getAttribute('title')?.replace(/,/g, '')
    ) || 0;

    console.log(totalStars);
  }
}
