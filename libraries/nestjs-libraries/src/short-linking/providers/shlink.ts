import axios, { AxiosInstance } from 'axios';
import { ShortLinking } from '../short-linking.interface';

type ShlinkShortUrlResponse = {
  shortUrl?: string;
  shortCode?: string;
  longUrl?: string;
  visitsSummary?: {
    total?: number;
  };
};

export class ShlinkProvider implements ShortLinking {
  public shortLinkDomain: string;

  private readonly client: AxiosInstance;
  private readonly apiBase: string;

  constructor() {
    const baseUrl = process.env.SHLINK_URL;
    const apiKey = process.env.SHLINK_API_KEY;
    const shortDomain = process.env.SHLINK_DOMAIN;

    if (!baseUrl) {
      throw new Error('SHLINK_URL is not set');
    }

    if (!apiKey) {
      throw new Error('SHLINK_API_KEY is not set');
    }

    const parsedBaseUrl = new URL(baseUrl);

    this.apiBase = `${baseUrl.replace(/\/$/, '')}/rest/v3`;
    this.shortLinkDomain = shortDomain || parsedBaseUrl.host;

    this.client = axios.create({
      baseURL: this.apiBase,
      timeout: 10000,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async convertLinkToShortLink(id: string, link: string): Promise<string> {
    const payload: Record<string, unknown> = {
      longUrl: link,
      tags: id ? [id] : [],
    };

    if (process.env.SHLINK_DOMAIN) {
      payload.domain = process.env.SHLINK_DOMAIN;
    }

    const response = await this.client.post<ShlinkShortUrlResponse>(
      '/short-urls',
      payload
    );

    if (response.data?.shortUrl) {
      return response.data.shortUrl;
    }

    if (response.data?.shortCode) {
      return `https://${this.shortLinkDomain}/${response.data.shortCode}`;
    }

    throw new Error('Shlink did not return a short URL');
  }

  async convertShortLinkToLink(shortLink: string): Promise<string> {
    const shortCode = this.extractShortCode(shortLink);

    const response = await this.client.get<ShlinkShortUrlResponse>(
      `/short-urls/${encodeURIComponent(shortCode)}`
    );

    if (!response.data?.longUrl) {
      throw new Error('Shlink did not return the original URL');
    }

    return response.data.longUrl;
  }

  async linksStatistics(
    links: string[]
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    const results = await Promise.all(
      links.map(async (shortLink) => {
        const shortCode = this.extractShortCode(shortLink);

        const response = await this.client.get<ShlinkShortUrlResponse>(
          `/short-urls/${encodeURIComponent(shortCode)}`
        );

        return {
          short: response.data.shortUrl || shortLink,
          original: response.data.longUrl || '',
          clicks: String(response.data.visitsSummary?.total ?? 0),
        };
      })
    );

    return results;
  }

  async getAllLinksStatistics(
    id: string,
    page: number
  ): Promise<{ short: string; original: string; clicks: string }[]> {
    const pageNumber = Number.isFinite(page) && page > 0 ? page : 1;

    const response = await this.client.get<{
      shortUrls?: {
        data?: ShlinkShortUrlResponse[];
      };
    }>('/short-urls', {
      params: {
        page: pageNumber,
        itemsPerPage: 20,
        tags: id || undefined,
      },
    });

    const items = response.data?.shortUrls?.data || [];

    return items.map((item) => ({
      short:
        item.shortUrl ||
        (item.shortCode
          ? `https://${this.shortLinkDomain}/${item.shortCode}`
          : ''),
      original: item.longUrl || '',
      clicks: String(item.visitsSummary?.total ?? 0),
    }));
  }

  private extractShortCode(shortLink: string): string {
    try {
      const url = new URL(shortLink);
      return url.pathname.replace(/^\/+/, '');
    } catch {
      return shortLink.replace(/^\/+/, '');
    }
  }
}