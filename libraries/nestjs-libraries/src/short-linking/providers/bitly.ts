import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

const options = {
  headers: {
    Authorization: `Bearer ${process.env.BITLY_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

export class Bitly implements ShortLinking {
  shortLinkDomain = 'bit.ly';

  async linksStatistics(links: string[]) {
    return Promise.all(
      links.map(async (link) => {
        const linkId = link.split('/').pop();
        const response = await (
          await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${linkId}`, options)
        ).json();

        const clicksResponse = await (
          await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${linkId}/clicks/summary`, options)
        ).json();

        return {
          short: link,
          original: response.long_url,
          clicks: clicksResponse.total_clicks || 0,
        };
      })
    );
  }

  async convertLinkToShortLink(id: string, link: string) {
    return (
      await (
        await fetch(`https://api-ssl.bitly.com/v4/shorten`, {
          ...options,
          method: 'POST',
          body: JSON.stringify({
            long_url: link,
            group_guid: id,
            domain: this.shortLinkDomain,
          }),
        })
      ).json()
    ).link;
  }

  async convertShortLinkToLink(shortLink: string) {
    const linkId = shortLink.split('/').pop();
    const response  = await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${linkId}`, options);
    const data = await response.json();
    return data.long_url;
  }
  
  async getAllLinksStatistics(
    groupId: string,
    page = 1
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    const response = await (
      await fetch(
        `https://api-ssl.bitly.com/v4/groups/${groupId}/bitlinks?page=${page}&size=100`,
        options
      )
    ).json();

    const mapLinks = await Promise.all(
      response.links.map(async (link: any) => {
        const clicksResponse = await (
          await fetch(`https://api-ssl.bitly.com/v4/bitlinks/${link.id}/clicks/summary`, options)
        ).json();

        return {
          short: link.link,
          original: link.long_url,
          clicks: clicksResponse.total_clicks || 0,
        };
      })
    );

    if (mapLinks.length < 100) {
      return mapLinks;
    }

    return [...mapLinks, ...(await this.getAllLinksStatistics(groupId, page + 1))];
  }
}