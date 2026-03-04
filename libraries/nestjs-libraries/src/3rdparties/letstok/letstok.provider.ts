import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';

function getStudioToolsUrl(): string {
  return process.env.STUDIO_TOOLS_API_URL || 'http://localhost:3019';
}

function getInternalApiKey(): string {
  return process.env.INTERNAL_API_KEY || '';
}

@ThirdParty({
  identifier: 'letstok',
  title: 'Letstok AI',
  description:
    'Import your AI-generated media from Letstok AI studio.',
  position: 'media',
  fields: [],
})
export class LetstokProvider extends ThirdPartyAbstract<{
  videoUrl: string;
}> {
  async checkConnection(
    email: string
  ): Promise<false | { name: string; username: string; id: string }> {
    try {
      const response = await fetch(
        `${getStudioToolsUrl()}/api/internal/user-by-email?email=${encodeURIComponent(email)}`,
        {
          headers: {
            'x-internal-api-key': getInternalApiKey(),
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return {
        name: data.fullName || email,
        username: email,
        id: data.firebaseUid,
      };
    } catch {
      return false;
    }
  }

  async listMedia(
    email: string,
    params?: { page?: number; type?: string; source?: string }
  ) {
    try {
      const page = params?.page || 1;
      const type = params?.type;
      const source = params?.source;
      let url = `${getStudioToolsUrl()}/api/internal/gallery?email=${encodeURIComponent(email)}&page=${page}&limit=20`;
      if (type) {
        url += `&type=${encodeURIComponent(type)}`;
      }
      if (source) {
        url += `&source=${encodeURIComponent(source)}`;
      }
      const response = await fetch(url, {
        headers: {
          'x-internal-api-key': getInternalApiKey(),
        },
      });

      if (!response.ok) {
        return { data: [], total: 0, totalPages: 0 };
      }

      return response.json();
    } catch {
      return { data: [], total: 0, totalPages: 0 };
    }
  }

  async sendData(
    _email: string,
    data: { videoUrl: string }
  ): Promise<string> {
    return data.videoUrl;
  }
}
