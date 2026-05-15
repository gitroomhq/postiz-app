import {
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { timer } from '@gitroom/helpers/utils/timer';
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  getAiVideoApiKey,
  getAiVideoBaseUrl,
  getAiVideoModel,
  hasAiVideoApiKey,
} from '@gitroom/nestjs-libraries/openai/ai.config';

class Image {
  @IsString()
  id: string;

  @IsString()
  path: string;
}
class Veo3Params {
  @IsString()
  prompt: string;

  @Type(() => Image)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMaxSize(3)
  images: Image[];
}

@Video({
  identifier: 'veo3',
  title: 'Veo3 (Audio + Video)',
  description: 'Generate videos with the most advanced video model.',
  placement: 'text-to-image',
  dto: Veo3Params,
  tools: [],
  trial: false,
  available: hasAiVideoApiKey(),
})
export class Veo3 extends VideoAbstract<Veo3Params> {
  override dto = Veo3Params;
  async process(
    output: 'vertical' | 'horizontal',
    customParams: Veo3Params
  ): Promise<URL> {
    const value = await (
      await fetch(`${getAiVideoBaseUrl()}/veo/generate`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAiVideoApiKey()}`,
        },
        method: 'POST',
        body: JSON.stringify({
          prompt: customParams.prompt,
          imageUrls: customParams?.images?.map((p) => p.path) || [],
          model: getAiVideoModel(),
          aspectRatio: output === 'horizontal' ? '16:9' : '9:16',
        }),
      })
    ).json();

    if (value.code !== 200 && value.code !== 201) {
      throw new Error(`Failed to generate video`);
    }

    const taskId = value.data.taskId;
    let videoUrl = [];
    while (videoUrl.length === 0) {
      console.log('waiting for video to be ready');
      const data = await (
        await fetch(
          `${getAiVideoBaseUrl()}/veo/record-info?taskId=${taskId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getAiVideoApiKey()}`,
            },
          }
        )
      ).json();

      if (data.code !== 200 && data.code !== 400) {
        throw new Error(`Failed to get video info`);
      }

      videoUrl = data?.data?.response?.resultUrls || [];
      await timer(10000);
    }

    return videoUrl[0];
  }
}
