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
class SeedanceParams {
  @IsString()
  prompt: string;

  @Type(() => Image)
  @ValidateNested({ each: true })
  @IsArray()
  @ArrayMaxSize(3)
  images: Image[];
}

@Video({
  identifier: 'seedance',
  title: 'Seedance 2.0 (Audio + Video)',
  description: 'Generate videos with the most advanced video model.',
  placement: 'text-to-image',
  dto: SeedanceParams,
  tools: [],
  trial: false,
  available: !!process.env.EVOLINK_API_KEY,
})
export class Seedance extends VideoAbstract<SeedanceParams> {
  override dto = SeedanceParams;
  async process(
    output: 'vertical' | 'horizontal',
    customParams: SeedanceParams
  ): Promise<URL> {
    const imageUrls = customParams?.images?.map((p) => p.path) || [];
    const value = await (
      await fetch('https://api.evolink.ai/v1/videos/generations', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EVOLINK_API_KEY}`,
        },
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          model: imageUrls.length
            ? 'seedance-2.0-fast-reference-to-video'
            : 'seedance-2.0-fast-text-to-video',
          prompt: customParams.prompt,
          ...(imageUrls.length ? { image_urls: imageUrls } : {}),
          aspect_ratio: output === 'horizontal' ? '16:9' : '9:16',
          duration: 8,
          quality: '720p',
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

    console.log('seedance taskId', taskId);
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
