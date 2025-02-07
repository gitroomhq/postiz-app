import { Dub } from '@gitroom/nestjs-libraries/short-linking/providers/dub';
import { Empty } from '@gitroom/nestjs-libraries/short-linking/providers/empty';
import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';
import { Injectable } from '@nestjs/common';
import { ShortIo } from './providers/short.io';

const getProvider = (): ShortLinking => {
  if (process.env.DUB_TOKEN) {
    return new Dub();
  }

  if ( process.env.SHORT_IO_SECRET_KEY ) {
    return new ShortIo();
  }

  return new Empty();
};

@Injectable()
export class ShortLinkService {
  static provider = getProvider();

  askShortLinkedin(messages: string[]): boolean {
    if (ShortLinkService.provider.shortLinkDomain === 'empty') {
      return false;
    }

    const mergeMessages = messages.join(' ');
    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
    const urls = mergeMessages.match(urlRegex);
    if (!urls) {
      // No URLs found, return the original text
      return false;
    }

    return urls.some((url) => url.indexOf(ShortLinkService.provider.shortLinkDomain) === -1);
  }

  async convertTextToShortLinks(id: string, messages: string[]) {
    if (ShortLinkService.provider.shortLinkDomain === 'empty') {
      return messages;
    }

    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
    return Promise.all(
      messages.map(async (text) => {
        const urls = text.match(urlRegex);
        if (!urls) {
          // No URLs found, return the original text
          return text;
        }

        const replacementMap: Record<string, string> = {};

        // Process each URL asynchronously
        await Promise.all(
          urls.map(async (url) => {
            if (url.indexOf(ShortLinkService.provider.shortLinkDomain) === -1) {
              replacementMap[url] =
                await ShortLinkService.provider.convertLinkToShortLink(id, url);
            } else {
              replacementMap[url] = url; // Keep the original URL if it matches the prefix
            }
          })
        );

        // Replace the URLs in the text with their replacements
        return text.replace(urlRegex, (url) => replacementMap[url]);
      })
    );
  }

  async convertShortLinksToLinks(messages: string[]) {
    if (ShortLinkService.provider.shortLinkDomain === 'empty') {
      return messages;
    }

    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/g;
    return Promise.all(
      messages.map(async (text) => {
        const urls = text.match(urlRegex);
        if (!urls) {
          // No URLs found, return the original text
          return text;
        }

        const replacementMap: Record<string, string> = {};

        // Process each URL asynchronously
        await Promise.all(
          urls.map(async (url) => {
            if (url.indexOf(ShortLinkService.provider.shortLinkDomain) > -1) {
              replacementMap[url] =
                await ShortLinkService.provider.convertShortLinkToLink(url);
            } else {
              replacementMap[url] = url; // Keep the original URL if it matches the prefix
            }
          })
        );

        // Replace the URLs in the text with their replacements
        return text.replace(urlRegex, (url) => replacementMap[url]);
      })
    );
  }

  async getStatistics(messages: string[]) {
    if (ShortLinkService.provider.shortLinkDomain === 'empty') {
      return [];
    }

    const mergeMessages = messages.join(' ');
    const regex = new RegExp(
      `https?://${ShortLinkService.provider.shortLinkDomain.replace(
        '.',
        '\\.'
      )}/[^\\s]*`,
      'g'
    );
    const urls = mergeMessages.match(regex);
    if (!urls) {
      // No URLs found, return the original text
      return [];
    }

    return ShortLinkService.provider.linksStatistics(urls);
  }

  async getAllLinks(id: string) {
    if (ShortLinkService.provider.shortLinkDomain === 'empty') {
      return [];
    }

    return ShortLinkService.provider.getAllLinksStatistics(id, 1);
  }
}
