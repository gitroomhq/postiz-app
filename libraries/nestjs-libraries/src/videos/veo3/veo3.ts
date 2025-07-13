import {
  Prompt,
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { timer } from '@gitroom/helpers/utils/timer';

@Video({
  identifier: 'veo3',
  title: 'Veo3 (Audio + Video)',
  description: 'Generate videos with the most advanced video model.',
  placement: 'text-to-image',
  trial: false,
  available: !!process.env.KIEAI_API_KEY,
})
export class Veo3 extends VideoAbstract {
  async process(
    prompt: Prompt[],
    output: 'vertical' | 'horizontal',
    customParams: { prompt: string; images: { id: string; path: string }[] }
  ): Promise<URL> {
    console.log({
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
      },
      method: 'POST',
      body: JSON.stringify({
        prompt: customParams.prompt,
        imageUrls: customParams?.images?.map((p) => p.path) || [],
        model: 'veo3_fast',
        aspectRatio: output === 'horizontal' ? '16:9' : '9:16',
      }),
    });
    const value = await (
      await fetch('https://api.kie.ai/api/v1/veo/generate', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
        },
        method: 'POST',
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
    let videoUrl = [];
    while (videoUrl.length === 0) {
      console.log('waiting for video to be ready');
      const data = await (
        await fetch(
          'https://api.kie.ai/api/v1/veo/record-info?taskId=' + taskId,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
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
