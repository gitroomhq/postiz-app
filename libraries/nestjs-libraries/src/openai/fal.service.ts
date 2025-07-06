import { Injectable } from '@nestjs/common';

import pLimit from 'p-limit';
const limit = pLimit(10);

@Injectable()
export class FalService {
  async generateImageFromText(
    model: string,
    text: string,
    isVertical: boolean = false
  ): Promise<string> {
    const { images, video, ...all } = await (
      await limit(() =>
        fetch(`https://fal.run/fal-ai/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: text,
            aspect_ratio: isVertical ? '9:16' : '16:9',
            resolution: '720p',
            num_images: 1,
            output_format: 'jpeg',
            expand_prompt: true,
          }),
        })
      )
    ).json();

    console.log(all, video, images);

    if (video) {
      return video.url;
    }

    return images[0].url as string;
  }
}
