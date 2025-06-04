export interface ShortLinking {
  shortLinkDomain: string;
  linksStatistics(
    links: string[]
  ): Promise<{ short: string; original: string; clicks: string }[]>;
  convertLinkToShortLink(id: string, link: string): Promise<string>;
  convertShortLinkToLink(shortLink: string): Promise<string>;
  getAllLinksStatistics(
    id: string,
    page: number
  ): Promise<{ short: string; original: string; clicks: string }[]>;
}
