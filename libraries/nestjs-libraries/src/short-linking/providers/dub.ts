import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

const options = {
  headers: {
    Authorization: `Bearer ${process.env.DUB_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

export class Dub implements ShortLinking {
  shortLinkDomain = 'dub.sh';

  async linksStatistics(links: string[]) {
    return Promise.all(
      links.map(async (link) => {
        const response = await (
          await fetch(`https://api.dub.co/links/info?domain=${this.shortLinkDomain}&key=${link.split('/').pop()}`, options)
        ).json();

        return {
          short: link,
          original: response.url,
          clicks: response.clicks,
        };
      })
    );
  }

  async convertLinkToShortLink(id: string, link: string) {
    return (
      await (
        await fetch(`https://api.dub.co/links`, {
          ...options,
          method: 'POST',
          body: JSON.stringify({
            url: link,
            tenantId: id,
            domain: this.shortLinkDomain,
          }),
        })
      ).json()
    ).shortLink;
  }

  async convertShortLinkToLink(shortLink: string) {
    return await (
      await (
        await fetch(
          `https://api.dub.co/links/info?domain=${shortLink}`,
          options
        )
      ).json()
    ).url;
  }

  // recursive functions that gets maximum 100 links per request if there are less than 100 links stop the recursion
  async getAllLinksStatistics(
    id: string,
    page = 1
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    const response = await (
      await fetch(
        `https://api.dub.co/links?tenantId=${id}&page=${page}&pageSize=100`,
        options
      )
    ).json();

    const mapLinks = response.links.map((link: any) => ({
      short: link,
      original: response.url,
      clicks: response.clicks,
    }));

    if (mapLinks.length < 100) {
      return mapLinks;
    }

    return [...mapLinks, ...(await this.getAllLinksStatistics(id, page + 1))];
  }
}
