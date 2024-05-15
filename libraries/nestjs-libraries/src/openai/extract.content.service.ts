import { Injectable } from '@nestjs/common';
import { JSDOM } from 'jsdom';

@Injectable()
export class ExtractContentService {
  async extractContent(url: string) {
    const load = await (await fetch(url)).text();
    const dom = new JSDOM(load);
    const allElements = Array.from(
      dom.window.document.querySelectorAll('*')
    ).filter((f) => f.tagName !== 'SCRIPT');
    const findIndex = allElements.findIndex((element) => {
      return (
        ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(
          element.tagName.toLowerCase()
        ) > -1
      );
    });

    if (!findIndex) {
      return false;
    }

    return allElements
      .slice(findIndex)
      .map((element) => element.textContent)
      .filter((f) => {
        const trim = f?.trim();
        return (trim?.length || 0) > 0 && trim !== '\n';
      })
      .map((f) => f?.trim())
      .join('')
      .replace(/\n/g, ' ')
      .replace(/ {2,}/g, ' ');
  }
}
