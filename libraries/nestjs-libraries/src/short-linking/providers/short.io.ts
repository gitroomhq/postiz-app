import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

const options = {
  headers: {
    Authorization: `Bearer ${process.env.SHORT_IO_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
};

export class ShortIo implements ShortLinking {
  shortLinkDomain = 'short.io';

  async linksStatistics(links: string[]) {
    return Promise.all(
      links.map(async (link) => {
        const url = `https://api.short.io/links/expand?domain=${
          this.shortLinkDomain
        }&path=${link.split('/').pop()}`;
        const response = await fetch(url, options).then((res) => res.json());

        const linkStatisticsUrl = `https://statistics.short.io/statistics/link/${response.id}?period=last30&tz=UTC`;

        const statResponse = await fetch(linkStatisticsUrl, options).then(
          (res) => res.json()
        );

        return {
          short: response.shortURL,
          original: response.originalURL,
          clicks: statResponse.totalClicks,
        };
      })
    );
  }

  async convertLinkToShortLink(id: string, link: string) {
    const response = await fetch(`https://api.short.io/links`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({
        url: link,
        tenantId: id,
        domain: this.shortLinkDomain,
        originalURL: link,
      }),
    }).then((res) => res.json());

    return response.shortURL;
  }

  async convertShortLinkToLink(shortLink: string) {
    return await (
      await (
        await fetch(
          `https://api.short.io/links/expand?domain=${
            this.shortLinkDomain
          }&path=${shortLink.split('/').pop()}`,
          options
        )
      ).json()
    ).originalURL;
  }

  // recursive functions that gets maximum 100 links per request if there are less than 100 links stop the recursion
  async getAllLinksStatistics(
    id: string,
    page = 1
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    const response = await (
      await fetch(
        `https://api.short.io/api/links?domain_id=${id}&limit=150`,
        options
      )
    ).json();

    const mapLinks = response.links.map(async (link: any) => {
      const linkStatisticsUrl = `https://statistics.short.io/statistics/link/${response.id}?period=last30&tz=UTC`;

      const statResponse = await fetch(linkStatisticsUrl, options).then((res) =>
        res.json()
      );

      return {
        short: link,
        original: response.url,
        clicks: statResponse.totalClicks,
      };
    });

    if (mapLinks.length < 100) {
      return mapLinks;
    }

    return [...mapLinks, ...(await this.getAllLinksStatistics(id, page + 1))];
  }
}
