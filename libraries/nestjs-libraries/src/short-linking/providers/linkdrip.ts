import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

const LINK_DRIP_API_ENDPOINT =
  process.env.LINK_DRIP_API_ENDPOINT || 'https://api.linkdrip.com/v1/';
const LINK_DRIP_SHORT_LINK_DOMAIN =
  process.env.LINK_DRIP_SHORT_LINK_DOMAIN || 'dripl.ink';

const getOptions = () => ({
  headers: {
    Authorization: `Bearer ${process.env.LINK_DRIP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export class LinkDrip implements ShortLinking {
  shortLinkDomain = LINK_DRIP_SHORT_LINK_DOMAIN;

  async linksStatistics(links: string[]) {
    return Promise.resolve([]);
  }

  async convertLinkToShortLink(id: string, link: string) {
    try {
      const response = await fetch(`${LINK_DRIP_API_ENDPOINT}/create`, {
        ...getOptions(),
        method: 'POST',
        body: JSON.stringify({
          target_url: link,
          custom_domain: this.shortLinkDomain,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to create LinkDrip API short link with status: ${response.status}`
        );
      }

      const data = await response.json();
      return data.link;
    } catch (error) {
      throw new Error(`Failed to create LinkDrip short link: ${error}`);
    }
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
