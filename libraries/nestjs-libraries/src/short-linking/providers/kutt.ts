import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

const KUTT_API_ENDPOINT = process.env.KUTT_API_ENDPOINT || 'https://kutt.it/api/v2';
const KUTT_SHORT_LINK_DOMAIN = process.env.KUTT_SHORT_LINK_DOMAIN || 'kutt.it';

const getOptions = () => ({
  headers: {
    'X-API-Key': process.env.KUTT_API_KEY,
    'Content-Type': 'application/json',
  },
});

export class Kutt implements ShortLinking {
  shortLinkDomain = KUTT_SHORT_LINK_DOMAIN;

  async linksStatistics(links: string[]) {
    return Promise.all(
      links.map(async (link) => {
        const linkId = link.split('/').pop();
        
        try {
          const response = await fetch(
            `${KUTT_API_ENDPOINT}/links/${linkId}/stats`,
            getOptions()
          );
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          return {
            short: link,
            original: data.address || '',
            clicks: data.lastDay?.stats?.reduce((total: number, stat: any) => total + stat, 0)?.toString() || '0',
          };
        } catch (error) {
          return {
            short: link,
            original: '',
            clicks: '0',
          };
        }
      })
    );
  }

  async convertLinkToShortLink(id: string, link: string) {
    try {
      const response = await fetch(`${KUTT_API_ENDPOINT}/links`, {
        ...getOptions(),
        method: 'POST',
        body: JSON.stringify({
          target: link,
          domain: this.shortLinkDomain,
          reuse: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.link;
    } catch (error) {
      throw new Error(`Failed to create short link: ${error}`);
    }
  }

  async convertShortLinkToLink(shortLink: string) {
    const linkId = shortLink.split('/').pop();
    
    try {
      const response = await fetch(
        `${KUTT_API_ENDPOINT}/links/${linkId}/stats`,
        getOptions()
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.address || '';
    } catch (error) {
      throw new Error(`Failed to get original link: ${error}`);
    }
  }

  async getAllLinksStatistics(
    id: string,
    page = 1
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    try {
      const response = await fetch(
        `${KUTT_API_ENDPOINT}/links?limit=100&skip=${(page - 1) * 100}`,
        getOptions()
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const mapLinks = data.data?.map((link: any) => ({
        short: link.link,
        original: link.address,
        clicks: link.visit_count?.toString() || '0',
      })) || [];

      if (mapLinks.length < 100) {
        return mapLinks;
      }

      return [...mapLinks, ...(await this.getAllLinksStatistics(id, page + 1))];
    } catch (error) {
      return [];
    }
  }
}