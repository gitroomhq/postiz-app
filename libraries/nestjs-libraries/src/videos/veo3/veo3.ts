import {
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { timer } from '@gitroom/helpers/utils/timer';
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  available: !!process.env.EVOLINK_API_KEY,
})
export class Veo3 extends VideoAbstract<Veo3Params> {
  override dto = Veo3Params;
  async process(
    output: 'vertical' | 'horizontal',
    customParams: Veo3Params
  ): Promise<URL> {
    const value = await (
      await fetch('https://api.evolink.ai/v1/videos/generations', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EVOLINK_API_KEY}`,
        },
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: 'veo3.1-fast',
          prompt: customParams.prompt,
          image_urls: customParams?.images?.map((p) => p.path) || [],
          aspect_ratio: output === 'horizontal' ? '16:9' : '9:16',
          duration: 8,
          generate_audio: true,
        }),
      })
    ).json();

    const taskId = value?.id;
    if (!taskId) {
      throw new Error(
        value?.error
          ? `${value.error.code}: ${value.error.message}`
          : `Failed to generate video`
      );
    }

    console.log('veo3 taskId', taskId);
    let attempts = 0;
    const maxAttempts = 180; // ~30 minutes at 10s interval
    while (true) {
      if (attempts++ >= maxAttempts) {
        throw new Error('Video generation timed out');
      }

      console.log('waiting for video to be ready');
      const data = await (
        await fetch('https://api.evolink.ai/v1/tasks/' + taskId, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EVOLINK_API_KEY}`,
          },
          signal: AbortSignal.timeout(30000),
        })
      ).json();

      if (data?.status === 'completed') {
        const videoUrl = data?.results || [];
        if (videoUrl.length > 0) {
          return videoUrl[0];
        }
        throw new Error('Video generation succeeded but no video URL returned');
      }

      if (data?.status !== 'pending' && data?.status !== 'processing') {
        throw new Error(
          data?.error
            ? `${data.error.code}: ${data.error.message}`
            : `Video generation failed (status ${data?.status})`
        );
      }

      await timer(10000);
    }
  }
}
