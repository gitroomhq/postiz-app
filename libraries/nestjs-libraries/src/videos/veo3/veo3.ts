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
  available: !!process.env.KIEAI_API_KEY,
})
export class Veo3 extends VideoAbstract<Veo3Params> {
  override dto = Veo3Params;
  async process(
    output: 'vertical' | 'horizontal',
    customParams: Veo3Params
  ): Promise<URL> {
    const value = await (
      await fetch('https://api.kie.ai/api/v1/veo/generate', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
        },
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          prompt: customParams.prompt,
          imageUrls: customParams?.images?.map((p) => p.path) || [],
          model: 'veo3_fast',
          aspectRatio: output === 'horizontal' ? '16:9' : '9:16',
        }),
      })
    ).json();

    if (value.code !== 200 && value.code !== 201) {
      throw new Error(`Failed to generate video`);
    }

    const taskId = value.data.taskId;
    console.log('veo3 taskId', taskId);
    let attempts = 0;
    const maxAttempts = 180; // ~30 minutes at 10s interval
    while (true) {
      if (attempts++ >= maxAttempts) {
        throw new Error('Video generation timed out');
      }

      console.log('waiting for video to be ready');
      const data = await (
        await fetch(
          'https://api.kie.ai/api/v1/veo/record-info?taskId=' + taskId,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
            },
            signal: AbortSignal.timeout(30000),
          }
        )
      ).json();

      if (data.code !== 200) {
        throw new Error(data?.msg || `Failed to get video info`);
      }

      // successFlag: 0 = generating, 1 = success, anything else = failed
      const successFlag = data?.data?.successFlag;
      if (successFlag !== 0 && successFlag !== 1) {
        throw new Error(
          data?.data?.errorMessage ||
            `Video generation failed (status ${successFlag})`
        );
      }

      const videoUrl = data?.data?.response?.resultUrls || [];
      if (videoUrl.length > 0) {
        return videoUrl[0];
      }

      if (successFlag === 1) {
        throw new Error('Video generation succeeded but no video URL returned');
      }

      await timer(10000);
    }
  }
}
