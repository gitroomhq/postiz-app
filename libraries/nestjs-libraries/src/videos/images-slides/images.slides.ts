import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import {
  ExposeVideoFunction,
  URL,
  Video,
  VideoAbstract,
} from '@gitroom/nestjs-libraries/videos/video.interface';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { MediaProcessorStatus } from '@gitroom/nestjs-libraries/upload/media.processor.interface';
import { SlideshowResult } from '@gitroom/nestjs-libraries/upload/slideshow.processor.interface';
import { Readable } from 'stream';
import { parseBuffer } from 'music-metadata';
import { timer } from '@gitroom/helpers/utils/timer';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';

import pLimit from 'p-limit';
import { FalService } from '@gitroom/nestjs-libraries/openai/fal.service';
import { IsString } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';
const limit = pLimit(2);

// How the media processor lays the slides out (postiz-uploader README 4.6): a
// slide lasts its voice track plus the tail, the voice starts after the delay,
// and consecutive slides overlap by the transition
const AUDIO_DELAY_SECONDS = 0.5;
const TAIL_SECONDS = 1;
const TRANSITION_SECONDS = 0.5;
const POLL_INTERVAL = 5000;
// inside the 40 minute generateVideo activity, with room for the slides and voices
const RENDER_TIMEOUT = 30 * 60 * 1000;
// the activity is not retried, so a few failed status checks in a row are tolerated
const MAX_STATUS_ERRORS = 5;

// ElevenLabs reports quota and permission problems as 401 with the reason in
// the body, as either { detail: { status, message } } or { detail: 'text' }
async function elevenLabsError(response: Response) {
  const { detail } = await response.json().catch(() => ({ detail: undefined }));
  const reason =
    typeof detail === 'string'
      ? detail
      : detail?.message || detail?.status || response.statusText;
  return `ElevenLabs ${response.status}: ${reason}`;
}

async function getAudioDuration(buffer: Buffer): Promise<number> {
  const metadata = await parseBuffer(buffer, 'audio/mpeg');
  return metadata.format.duration || 0;
}

class ImagesSlidesParams {
  @JSONSchema({
    description: 'Elevenlabs voice id, use a special tool to get it, this is a required filed',
  })
  @IsString()
  voice: string;

  @JSONSchema({
    description: 'Simple string of the prompt, not a json',
  })
  @IsString()
  prompt: string;
}

@Video({
  identifier: 'image-text-slides',
  title: 'Image Text Slides',
  description: 'Generate videos slides from images and text, Don\'t break down the slides, provide only the first slide information',
  placement: 'text-to-image',
  tools: [{ functionName: 'loadVoices', output: 'voice id' }],
  dto: ImagesSlidesParams,
  trial: true,
  available:
    !!process.env.ELEVENSLABS_API_KEY &&
    UploadFactory.processorEnabled() &&
    !!process.env.OPENAI_API_KEY &&
    !!process.env.FAL_KEY,
})
export class ImagesSlides extends VideoAbstract<ImagesSlidesParams> {
  override dto = ImagesSlidesParams;
  private storage = UploadFactory.createStorage();
  private slideshow = UploadFactory.createSlideshowProcessor();
  constructor(
    private _openaiService: OpenaiService,
    private _falService: FalService
  ) {
    super();
  }

  async process(
    output: 'vertical' | 'horizontal',
    customParams: ImagesSlidesParams
  ): Promise<URL> {
    if (
      !this.slideshow ||
      !this.storage.signDownloadUrl ||
      !this.storage.signUploadUrl ||
      !this.storage.publicUrl
    ) {
      throw new Error(
        'Image Text Slides needs the media processor and cloud storage'
      );
    }

    const list = await this._openaiService.generateSlidesFromText(
      customParams.prompt
    );

    if (!list.length) {
      throw new Error('No slides could be generated from the prompt');
    }

    // Plain async calls so a failed image or voice request rejects Promise.all
    // and fails the job, instead of a promise that never settles and a job that
    // hangs until the workflow times out
    const slides = await Promise.all(
      list.map(async (current) => {
        const [image, voice] = await Promise.all([
          (async () => {
            const url = await this._falService.generateImageFromText(
              'ideogram/v2',
              current.imagePrompt,
              output === 'vertical'
            );

            // the processor only fetches from the bucket, so the generated
            // image is copied there first
            return this.storage.uploadSimple(url);
          })(),
          (async () => {
            const response = await limit(() =>
              fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${customParams.voice}?output_format=mp3_44100_128`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENSLABS_API_KEY || '',
                  },
                  body: JSON.stringify({
                    text: current.voiceText,
                    model_id: 'eleven_multilingual_v2',
                  }),
                  signal: AbortSignal.timeout(60000),
                }
              )
            );

            if (!response.ok) {
              throw new Error(await elevenLabsError(response));
            }

            const buffer = Buffer.from(await response.arrayBuffer());

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

            return { path, len: await getAudioDuration(buffer) };
          })(),
        ]);

        return {
          text: current.voiceText,
          imageKey: image.split('/').pop()!,
          audioKey: voice.path.split('/').pop()!,
          // the slide's duration, as the processor derives it
          duration: voice.len + TAIL_SECONDS,
        };
      })
    );

    // Cues on the output timeline: every crossfade pulls the next slide
    // forward by the transition (README 4.6)
    const cues = slides.map((slide, index) => {
      const start =
        slides
          .slice(0, index)
          .reduce((all, previous) => all + previous.duration, 0) -
        TRANSITION_SECONDS * index;

      // a cue ends where the next begins: overlapping cues are stacked by
      // libass and the later one keeps its shifted position
      const end =
        index < slides.length - 1
          ? start + slide.duration - TRANSITION_SECONDS
          : start + slide.duration;

      return { start, end, text: slide.text };
    });

    const outputKey = `${makeId(10)}.mp4`;
    const jobId = await this.slideshow.submit({
      version: 1,
      type: 'slideshow',
      reference: outputKey,
      slides: await Promise.all(
        slides.map(async (slide) => ({
          image: { url: await this.storage.signDownloadUrl!(slide.imageKey) },
          audio: { url: await this.storage.signDownloadUrl!(slide.audioKey) },
        }))
      ),
      frame:
        output === 'vertical'
          ? { width: 1080, height: 1920 }
          : { width: 1920, height: 1080 },
      fit: 'contain',
      audio_delay_seconds: AUDIO_DELAY_SECONDS,
      tail_seconds: TAIL_SECONDS,
      transition_seconds: TRANSITION_SECONDS,
      subtitles: { cues, style: { position: 'middle' } },
      output: {
        url: await this.storage.signUploadUrl(outputKey, 'video/mp4'),
        content_type: 'video/mp4',
      },
      limits: { timeout_seconds: 1500 },
    });

    const deadline = Date.now() + RENDER_TIMEOUT;
    let statusErrors = 0;
    while (Date.now() < deadline) {
      await timer(POLL_INTERVAL);

      let job: MediaProcessorStatus<SlideshowResult>;
      try {
        job = await this.slideshow.status(jobId);
        statusErrors = 0;
      } catch (err) {
        if (++statusErrors >= MAX_STATUS_ERRORS) {
          throw err;
        }
        console.error(
          `Slideshow status check ${statusErrors} failed for ${jobId}:`,
          err
        );
        continue;
      }

      if (job.status === 'pending') {
        continue;
      }

      if (job.status === 'failed') {
        throw new Error(job.error);
      }

      const { result } = job;
      if (result?.status === 'completed') {
        return this.storage.publicUrl(outputKey);
      }

      if (result?.status !== 'failed') {
        throw new Error(
          `Unexpected processor result: ${JSON.stringify(result ?? null).slice(0, 500)}`
        );
      }

      // the stderr tail is the only way to know what ffmpeg objected to
      throw new Error(
        [
          `${result.failure?.code || 'FAILED'}: ${
            result.failure?.message || ''
          }`,
          result.failure?.stderr_tail,
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 4000)
      );
    }

    throw new Error('The slideshow was not rendered in time');
  }

  @ExposeVideoFunction()
  async loadVoices(data: any) {
    const response = await fetch(
      'https://api.elevenlabs.io/v2/voices?page_size=40&category=premade',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENSLABS_API_KEY || '',
        },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(await elevenLabsError(response));
    }

    const { voices } = await response.json();

    return {
      voices: voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        preview_url: voice.preview_url,
      })),
    };
  }
}
