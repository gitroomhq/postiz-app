import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';

const BASE_URL = 'https://xquik.com/api/v1';

interface AccountResponse {
  xUsername?: string | null;
}

interface UserMediaTweet {
  id: string;
  url?: string;
  media?: Array<{
    type?: string;
    media_url_https?: string;
    video_info?: {
      variants?: Array<{ bitrate?: number; url: string; content_type?: string }>;
    };
  }>;
}

interface UserMediaResponse {
  tweets?: UserMediaTweet[];
}

@ThirdParty({
  identifier: 'xquik',
  title: 'Xquik',
  description:
    'Import media from your X (Twitter) account to reuse in new posts.',
  position: 'media-library',
  fields: [],
})
export class XquikProvider extends ThirdPartyAbstract {
  async checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }> {
    const res = await fetch(`${BASE_URL}/account`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!res.ok) {
      return false;
    }

    const body = (await res.json()) as AccountResponse;
    const xUsername = body.xUsername;

    if (!xUsername) {
      return false;
    }

    return {
      name: `Xquik (@${xUsername})`,
      username: xUsername,
      id: xUsername,
    };
  }

  async listMedia(
    apiKey: string,
    _data?: { page?: number }
  ): Promise<{
    results: {
      id: string;
      url: string;
      thumbnail?: string;
      name: string;
      type: 'video' | 'image';
    }[];
    pages: number;
  }> {
    const account = await fetch(`${BASE_URL}/account`, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!account.ok) {
      return { results: [], pages: 1 };
    }

    const { xUsername } = (await account.json()) as AccountResponse;
    if (!xUsername) {
      return { results: [], pages: 1 };
    }

    const mediaRes = await fetch(
      `${BASE_URL}/x/users/${encodeURIComponent(xUsername)}/media`,
      {
        headers: { 'X-API-Key': apiKey },
      }
    );

    if (!mediaRes.ok) {
      return { results: [], pages: 1 };
    }

    const body = (await mediaRes.json()) as UserMediaResponse;
    const tweets = body.tweets || [];

    const results: {
      id: string;
      url: string;
      thumbnail?: string;
      name: string;
      type: 'video' | 'image';
    }[] = [];

    for (const tweet of tweets) {
      for (const [index, m] of (tweet.media || []).entries()) {
        if (!m) continue;

        if (m.type === 'video' || m.type === 'animated_gif') {
          const variants = m.video_info?.variants || [];
          const best = variants
            .filter((v) => v.content_type === 'video/mp4' && v.bitrate)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          const url = best?.url;
          if (!url) continue;
          results.push({
            id: `${tweet.id}-${index}`,
            url,
            thumbnail: m.media_url_https,
            name: `x-${tweet.id}-${index}.mp4`,
            type: 'video',
          });
        } else {
          const url = m.media_url_https;
          if (!url) continue;
          results.push({
            id: `${tweet.id}-${index}`,
            url,
            thumbnail: url,
            name: `x-${tweet.id}-${index}`,
            type: 'image',
          });
        }
      }
    }

    return {
      results,
      pages: 1,
    };
  }

  async importMedia(
    _apiKey: string,
    items: { url: string; name: string }[]
  ): Promise<{ url: string; name: string }[]> {
    return items
      .filter((item) => item.url)
      .map((item) => ({
        url: item.url.split('?')[0],
        name: item.name || 'xquik-media',
      }));
  }

  async sendData(): Promise<string> {
    throw new Error('Xquik media-library provider does not support sendData');
  }
}
