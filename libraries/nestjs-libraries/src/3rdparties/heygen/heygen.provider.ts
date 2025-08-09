import {
  ThirdParty,
  ThirdPartyAbstract,
} from '@gitroom/nestjs-libraries/3rdparties/thirdparty.interface';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { timer } from '@gitroom/helpers/utils/timer';

@ThirdParty({
  identifier: 'heygen',
  title: 'HeyGen',
  description: 'HeyGen is a platform for creating AI-generated avatars videos.',
  position: 'media',
  fields: [],
})
export class HeygenProvider extends ThirdPartyAbstract<{
  voice: string;
  avatar: string;
  aspect_ratio: string;
  captions: string;
}> {
  // @ts-ignore
  constructor(private _openaiService: OpenaiService) {
    super();
  }

  async checkConnection(
    apiKey: string
  ): Promise<false | { name: string; username: string; id: string }> {
    const list = await fetch('https://api.heygen.com/v1/user/me', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': apiKey,
      },
    });

    if (!list.ok) {
      return false;
    }

    const { data } = await list.json();

    return {
      name: data.first_name + ' ' + data.last_name,
      username: data.username,
      id: data.username,
    };
  }

  async generateVoice(apiKey: string, data: { text: string }) {
    return {
      voice: await this._openaiService.generateVoiceFromText(data.text),
    };
  }

  async voices(apiKey: string) {
    const {
      data: { voices },
    } = await (
      await fetch('https://api.heygen.com/v2/voices', {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'x-api-key': apiKey,
        },
      })
    ).json();

    return voices.slice(0, 20);
  }

  async avatars(apiKey: string) {
    const {
      data: { avatar_group_list },
    } = await (
      await fetch(
        'https://api.heygen.com/v2/avatar_group.list?include_public=false',
        {
          method: 'GET',
          headers: {
            accept: 'application/json',
            'x-api-key': apiKey,
          },
        }
      )
    ).json();

    const loadedAvatars = [];
    for (const avatar of avatar_group_list) {
      const {
        data: { avatar_list },
      } = await (
        await fetch(
          `https://api.heygen.com/v2/avatar_group/${avatar.id}/avatars`,
          {
            method: 'GET',
            headers: {
              accept: 'application/json',
              'x-api-key': apiKey,
            },
          }
        )
      ).json();

      loadedAvatars.push(...avatar_list);
    }

    return loadedAvatars;
  }

  async sendData(
    apiKey: string,
    data: {
      voice: string;
      avatar: string;
      aspect_ratio: string;
      captions: string;
      selectedVoice: string;
      type: 'talking_photo' | 'avatar';
    }
  ): Promise<string> {
    const {
      data: { video_id },
    } = await (
      await fetch(`https://api.heygen.com/v2/video/generate`, {
        method: 'POST',
        body: JSON.stringify({
          caption: data.captions === 'yes',
          video_inputs: [
            {
              ...(data.type === 'avatar'
                ? {
                    character: {
                      type: 'avatar',
                      avatar_id: data.avatar,
                    },
                  }
                : {
                    character: {
                      type: 'talking_photo',
                      talking_photo_id: data.avatar,
                    },
                  }),
              voice: {
                type: 'text',
                input_text: data.voice,
                voice_id: data.selectedVoice,
              },
            },
          ],
          dimension:
            data.aspect_ratio === 'story'
              ? {
                  width: 720,
                  height: 1280,
                }
              : {
                  width: 1280,
                  height: 720,
                },
        }),
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'x-api-key': apiKey,
        },
      })
    ).json();

    while (true) {
      const {
        data: { status, video_url },
      } = await (
        await fetch(
          `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
          {
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'x-api-key': apiKey,
            },
          }
        )
      ).json();

      if (status === 'completed') {
        return video_url;
      } else if (status === 'failed') {
        throw new Error('Video generation failed');
      }

      await timer(3000);
    }
  }
}
