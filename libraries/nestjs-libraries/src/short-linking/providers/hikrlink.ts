import { ShortLinking } from '@gitroom/nestjs-libraries/short-linking/short-linking.interface';

/**
 * HikrLink (https://hikrlink.com) — first-party, server-side link attribution.
 * Public API, `x-api-key` auth (API_ACCESS entitlement):
 *   POST /public/urls                         → the URL entity: { shorturlId, url (= destination), ... }
 *   GET  /public/urls?page&pageSize           → { items: [{ shorturlId, url, redirectUrl, clicks, createdAt }], total }
 *   GET  /public/urls/:shorturlId             → { shorturlId, url, redirectUrl, clicks, createdAt }
 *   GET  /public/urls/:shorturlId/statistics  → { period, series, aggregates: { totalClicks, ... } }
 * Env: HIKRLINK_API_KEY (required to activate), HIKRLINK_API_ENDPOINT (default https://api.hikrl.ink/api),
 *      HIKRLINK_SHORT_LINK_DOMAIN (default hikrl.ink; the short URL is <domain>/<shorturlId>).
 */
const HIKRLINK_API_ENDPOINT =
  process.env.HIKRLINK_API_ENDPOINT || 'https://api.hikrl.ink/api';
const HIKRLINK_SHORT_LINK_DOMAIN =
  process.env.HIKRLINK_SHORT_LINK_DOMAIN || 'hikrl.ink';

const getOptions = () => ({
  headers: {
    'x-api-key': process.env.HIKRLINK_API_KEY,
    'Content-Type': 'application/json',
  },
});

const slugOf = (shortLink: string) => shortLink.split('/').pop();

export class HikrLink implements ShortLinking {
  shortLinkDomain = HIKRLINK_SHORT_LINK_DOMAIN;

  async convertLinkToShortLink(_id: string, link: string) {
    const response = await fetch(`${HIKRLINK_API_ENDPOINT}/public/urls`, {
      ...getOptions(),
      method: 'POST',
      body: JSON.stringify({ url: link }),
    });
    if (!response.ok) {
      throw new Error(`HikrLink: failed to create short link (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (!data?.shorturlId) {
      throw new Error('HikrLink: create response had no shorturlId');
    }
    return `https://${this.shortLinkDomain}/${data.shorturlId}`;
  }

  async convertShortLinkToLink(shortLink: string) {
    const response = await fetch(
      `${HIKRLINK_API_ENDPOINT}/public/urls/${slugOf(shortLink)}`,
      getOptions()
    );
    if (!response.ok) {
      throw new Error(`HikrLink: failed to resolve short link (HTTP ${response.status})`);
    }
    const data = await response.json();
    return (data?.redirectUrl as string) || '';
  }

  async linksStatistics(links: string[]) {
    return Promise.all(
      links.map(async (short) => {
        try {
          const response = await fetch(
            `${HIKRLINK_API_ENDPOINT}/public/urls/${slugOf(short)}`,
            getOptions()
          );
          if (!response.ok) {
            return { short, original: '', clicks: '0' };
          }
          const data = await response.json();
          return {
            short,
            original: data?.redirectUrl || '',
            clicks: String(data?.clicks ?? 0),
          };
        } catch {
          return { short, original: '', clicks: '0' };
        }
      })
    );
  }

  async getAllLinksStatistics(
    id: string,
    page = 1
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    try {
      const response = await fetch(
        `${HIKRLINK_API_ENDPOINT}/public/urls?page=${page}&pageSize=100`,
        getOptions()
      );
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      const mapped = (data?.items || []).map((item: any) => ({
        short: item.url,
        original: item.redirectUrl,
        clicks: String(item.clicks ?? 0),
      }));
      if (mapped.length < 100) {
        return mapped;
      }
      return [...mapped, ...(await this.getAllLinksStatistics(id, page + 1))];
    } catch {
      return [];
    }
  }
}
