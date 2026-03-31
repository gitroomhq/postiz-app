import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';

const BASE_URL = 'https://reel.farm/api/v1';

@ThirdParty({
  identifier: 'reelfarm',
  title: 'Reel.Farm',
  description:
    'Import UGC and greenscreen videos from your Reel.Farm account.',
  position: 'media-library',
  fields: [],
})
export class ReelFarmProvider extends ThirdPartyAbstract {
  async checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }> {
    const res = await fetch(`${BASE_URL}/videos?limit=1`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      return false;
    }

    return {
      name: 'Reel.Farm',
      username: 'reelfarm',
      id: apiKey.slice(-8),
    };
  }

  async listMedia(
    apiKey: string,
    data?: { page?: number }
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
    const page = data?.page || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const allVideos = [];

    for (const videoType of ['ugc', 'greenscreen']) {
      const res = await fetch(
        `${BASE_URL}/videos?video_type=${videoType}&status=completed&limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (res.ok) {
        const body = await res.json();
        const videos = body.videos || body.data || [];
        console.log(body);
        allVideos.push(
          ...videos.map((v: any) => ({
            ...v,
            _video_type: videoType,
          }))
        );
      }
    }

    const total = allVideos.length;

    console.log(allVideos);

    return {
      results: allVideos.slice(0, limit).map((v: any) => ({
        id: String(v.id || v.video_id),
        url: v.video_url || v.url || v.download_url || '',
        thumbnail: v.thumbnail_url || v.thumbnail || v.preview_url || '',
        name: `${v._video_type}`,
        type: 'video' as const,
      })),
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async importMedia(
    apiKey: string,
    items: { url: string; name: string }[]
  ): Promise<{ url: string; name: string }[]> {
    return items
      .filter((item) => item.url)
      .map((item) => ({
        url: item.url.split('#')[0].split('?')[0],
        name: item.name || 'reelfarm-video',
      }));
  }

  async sendData(): Promise<string> {
    throw new Error(
      'ReelFarm media-library provider does not support sendData'
    );
  }
}
