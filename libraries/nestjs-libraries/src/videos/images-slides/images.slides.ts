import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import {
  Prompt,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { chunk } from 'lodash';
import Transloadit from 'transloadit';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { Readable } from 'stream';
import { parseBuffer } from 'music-metadata';
import { stringifySync } from 'subtitle';

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_AUTH,
  authSecret: process.env.TRANSLOADIT_SECRET,
});

async function getAudioDuration(buffer: Buffer): Promise<number> {
  const metadata = await parseBuffer(buffer, 'audio/mpeg');
  return metadata.format.duration || 0;
}

@Video({
  identifier: 'image-text-slides',
  title: 'Image Text Slides',
  description: 'Generate videos slides from images and text',
  placement: 'text-to-image',
})
export class ImagesSlides extends VideoAbstract {
  private storage = UploadFactory.createStorage();
  constructor(private _openaiService: OpenaiService) {
    super();
  }

  async process(
    prompt: Prompt[],
    output: 'vertical' | 'horizontal'
  ): Promise<string> {
    const list = await this._openaiService.generateSlidesFromText(
      prompt[0].value
    );
    const generated = await Promise.all(
      list.reduce((all, current) => {
        all.push(
          new Promise(async (res) => {
            res({
              len: 0,
              url: await this._openaiService.generateImage(
                current.imagePrompt +
                  (output === 'vertical' ? ', vertical composition' : ''),
                true,
                output === 'vertical'
              ),
            });
          })
        );

        all.push(
          new Promise(async (res) => {
            const buffer = Buffer.from(
              await (
                await fetch(
                  `https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'xi-api-key': process.env.ELEVENSLABS_API_KEY || '',
                    },
                    body: JSON.stringify({
                      text: current.voiceText,
                      voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.75,
                      },
                    }),
                  }
                )
              ).arrayBuffer()
            );

            const { path } = await this.storage.uploadFile({
              buffer,
              mimetype: 'audio/mp3',
              size: buffer.length,
              path: '',
              fieldname: '',
              destination: '',
              stream: new Readable(),
              filename: '',
              originalname: '',
              encoding: '',
            });

            res({
              len: await getAudioDuration(buffer),
              url:
                path.indexOf('http') === -1
                  ? process.env.FRONTEND_URL +
                    '/' +
                    process.env.NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY +
                    path
                  : path,
            });
          })
        );

        return all;
      }, [] as Promise<any>[])
    );

    const split = chunk(generated, 2);

    const srt = stringifySync(
      list
        .reduce((all, current, index) => {
          const start = all.length ? all[all.length - 1].end : 0;
          const end = start + split[index][1].len * 1000 + 1000;
          all.push({
            start: start,
            end: end,
            text: current.voiceText,
          });

          return all;
        }, [] as { start: number; end: number; text: string }[])
        .map((item) => ({
          type: 'cue',
          data: item,
        })),
      { format: 'SRT' }
    );
    console.log(srt);

    await transloadit.createAssembly({
      uploads: {
        'subtitles.srt': srt,
      },
      params: {
        steps: {
          ...split.reduce((all, current, index) => {
            all[`image${index}`] = {
              robot: '/http/import',
              url: current[0].url,
            };
            all[`audio${index}`] = {
              robot: '/http/import',
              url: current[1].url,
            };
            all[`merge${index}`] = {
              use: [
                {
                  name: `image${index}`,
                  as: 'image',
                },
                {
                  name: `audio${index}`,
                  as: 'audio',
                },
              ],
              robot: '/video/merge',
              duration: current[1].len + 1,
              audio_delay: 0.5,
              preset: 'hls-1080p',
              resize_strategy: 'min_fit',
              loop: true,
            };
            return all;
          }, {} as any),
          concatenated: {
            robot: '/video/concat',
            result: false,
            video_fade_seconds: 0.5,
            use: split.map((p, index) => ({
              name: `merge${index}`,
              as: `video_${index + 1}`,
            })),
          },
          subtitled: {
            robot: '/video/subtitle',
            result: true,
            preset: 'hls-1080p',
            use: {
              bundle_steps: true,
              steps: [
                {
                  name: 'concatenated',
                  as: 'video',
                },
                {
                  name: ':original',
                  as: 'subtitles',
                },
              ],
            },
            position: 'center',
            font_size: 10,
            subtitles_type: 'burned',
          },
        },
      },
    });

    return '';
  }
}
