import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

export class Empty implements ShortLinking {
  shortLinkDomain = 'empty';

  async linksStatistics(links: string[]) {
    return [];
  }

  async convertLinkToShortLink(link: string) {
    return '';
  }

  async convertShortLinkToLink(shortLink: string) {
    return '';
  }

  getAllLinksStatistics(
    id: string,
    page: number
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    return Promise.resolve([]);
  }
}
