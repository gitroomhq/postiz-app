import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { generationError } from '@gitroom/nestjs-libraries/openai/generation.error';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import {
  AuthorizationActions,
  Sections,
  SubscriptionException,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { TemporalService } from 'nestjs-temporal-core';
import { TypedSearchAttributes } from '@temporalio/common';
import { organizationId } from '@gitroom/nestjs-libraries/temporal/temporal.search.attribute';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { MediaProcessorJob } from '@gitroom/nestjs-libraries/upload/media.processor.interface';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { ioRedis } from '@gitroom/nestjs-libraries/redis/redis.service';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';
import {
  getMaxSize,
  uploadStreamToStorage,
} from '@gitroom/nestjs-libraries/upload/custom.upload.validation';

// What every upload is normalized to before a provider ever sees it. The
// service applies exactly these, so a platform-specific need belongs in the
// provider, not here.
const VIDEO_RULES: MediaProcessorJob['rules'] = {
  short_side_min: 1080,
  short_side_max: 1080,
  long_side_max: 1920,
  video: {
    container: 'mp4',
    video_codec: 'h264',
    profile: 'high',
    pixel_format: 'yuv420p',
    fps_max: 60,
    quality: 23,
    audio_codec: 'aac',
    audio_bitrate_kbps: 128,
    audio_sample_rate: 48000,
    faststart: true,
  },
};
const IMAGE_RULES: MediaProcessorJob['rules'] = {
  short_side_min: 1,
  short_side_max: 1080,
  long_side_max: 1920,
  image: { jpeg_quality: 90, keep_format: true },
};
const LIMITS: MediaProcessorJob['limits'] = {
  max_input_bytes: 1073741824,
  max_duration_seconds: 900,
  timeout_seconds: 1200,
};
// Extension of the normalized file and the content type the presigned PUT is
// minted for; anything else (gif, avif, ...) is stored as uploaded
const PROCESSABLE: Record<
  string,
  { type: 'video' | 'image'; ext: string; contentType: string }
> = {
  '.mp4': { type: 'video', ext: 'mp4', contentType: 'video/mp4' },
  '.mov': { type: 'video', ext: 'mp4', contentType: 'video/mp4' },
  '.jpg': { type: 'image', ext: 'jpg', contentType: 'image/jpeg' },
  '.jpeg': { type: 'image', ext: 'jpg', contentType: 'image/jpeg' },
  '.png': { type: 'image', ext: 'png', contentType: 'image/png' },
  '.webp': { type: 'image', ext: 'webp', contentType: 'image/webp' },
};
// Formats a post can carry without normalization; anything else only exists to be converted
const USABLE_AS_IS = new Set([
  '.mp4',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();
  private processor = UploadFactory.createProcessor();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager,
    private _temporalService: TemporalService
  ) {}

  async deleteMedia(org: string, id: string) {
    return this._mediaRepository.deleteMedia(org, id);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean
  ) {
    try {
      const generating = await this._subscriptionService.useCredit(
        org,
        'ai_images',
        async () => {
          if (generatePromptFirst) {
            prompt = await this._openAi.generatePromptForPicture(prompt);
            console.log('Prompt:', prompt);
          }
          return this._openAi.generateImage(prompt);
        }
      );

      return generating;
    } catch (err) {
      throw generationError(err);
    }
  }

  // Streams the remote body straight into storage: only the sniffing prefix
  // and a few upload parts are ever in memory, so a 1 GB video does not cost
  // 1 GB of heap
  async uploadFromUrl(org: string, url: string) {
    let response: globalThis.Response;
    try {
      response = await fetch(url, {
        // @ts-ignore — undici option, not in lib.dom fetch types
        dispatcher: ssrfSafeDispatcher,
      });
    } catch (err) {
      // Network-level failure (DNS, connection refused, SSRF block, etc.) —
      // fetch rejects rather than returning a non-ok response. Keep the real
      // reason reachable for callers that want to surface it
      throw new BadRequestException('Failed to fetch URL', { cause: err });
    }
    if (!response.ok || !response.body) {
      throw new BadRequestException('Failed to fetch URL');
    }

    // Cheap early exit when the server declares the size; Content-Length may
    // be absent or wrong, so the stream cap below is what really enforces it.
    // The type isn't known yet (sniffed below), so this uses the largest cap
    const declaredSize = Number(response.headers.get('content-length'));
    if (declaredSize && declaredSize > getMaxSize('video/mp4')) {
      await response.body.cancel();
      throw new BadRequestException('File is too large.');
    }

    const uploaded = await uploadStreamToStorage(
      this.storage,
      response.body,
      declaredSize
    );
    return this.saveFile(org, uploaded.originalname, uploaded.path);
  }

  saveFile(
    org: string,
    fileName: string,
    filePath: string,
    originalName?: string
  ) {
    return this._mediaRepository.saveFile(
      org,
      fileName,
      filePath,
      originalName
    );
  }

  // Saves an upload and, when a normalizer is configured, hands it to the
  // processing workflow; the caller polls getMediaStatus until it is ready
  async saveUploadedFile(
    org: string,
    fileName: string,
    filePath: string,
    originalName?: string
  ) {
    const media = await this.saveFile(org, fileName, filePath, originalName);
    const client = this._temporalService.client.getRawClient();
    if (
      !this.processor ||
      !PROCESSABLE[extname(fileName).toLowerCase()] ||
      !client
    ) {
      return media;
    }

    await this._mediaRepository.startProcessing(org, media.id);
    try {
      await client.workflow.start('processMediaWorkflow', {
        workflowId: `media_${media.id}`,
        taskQueue: 'main',
        args: [{ mediaId: media.id }],
        typedSearchAttributes: new TypedSearchAttributes([
          {
            key: organizationId,
            value: org,
          },
        ]),
      });
    } catch (err) {
      // no workflow means nothing will ever flip the status
      return this.releaseUnprocessed(org, media.id, media.name);
    }

    return { ...media, status: 'processing' };
  }

  // Lets go of a media the normalizer will not touch. A source the platforms
  // accept as-is (mp4, png, ...) becomes ready; one that only exists to be
  // converted (mov) is failed, since nothing downstream can use it
  private async releaseUnprocessed(org: string, id: string, name: string) {
    const convertOnly = !USABLE_AS_IS.has(extname(name).toLowerCase());
    await this._mediaRepository.finishProcessing(org, id, {
      ...(convertOnly
        ? { error: 'No media processor is available to convert this file' }
        : {}),
    });
    return this._mediaRepository.getMediaStatus(org, id);
  }

  // Upload widget (MCP Apps): the session id is what the model sees and polls,
  // the ticket is the credential the widget uploads with. It is handed to the
  // widget only, so it doesn't end up in the conversation
  async createUploadSession(org: string) {
    const sessionId = randomBytes(16).toString('hex');
    await ioRedis.set(`uploadSession:${sessionId}`, org, 'EX', 3600);
    return sessionId;
  }

  private async checkUploadSession(org: string, sessionId: string) {
    if ((await ioRedis.get(`uploadSession:${sessionId}`)) !== org) {
      throw new HttpException('Upload session not found or expired', 404);
    }
  }

  async createUploadTicket(org: string, sessionId: string) {
    await this.checkUploadSession(org, sessionId);
    const ticket = randomBytes(32).toString('hex');
    await ioRedis.set(
      `uploadTicket:${ticket}`,
      JSON.stringify({ org, sessionId }),
      'EX',
      600
    );
    return ticket;
  }

  // A ticket never outlives its session: the file is streamed to storage right
  // after this check, so an expired session has to be refused here
  async getUploadTicket(ticket: string) {
    const found = JSON.parse(
      (await ioRedis.get(`uploadTicket:${ticket}`)) || 'null'
    ) as { org: string; sessionId: string } | null;
    if (
      !found ||
      (await ioRedis.get(`uploadSession:${found.sessionId}`)) !== found.org
    ) {
      return null;
    }
    return found;
  }

  async saveUploadSessionFile(
    org: string,
    sessionId: string,
    fileName: string,
    filePath: string,
    originalName?: string
  ) {
    await this.checkUploadSession(org, sessionId);
    const media = await this.saveUploadedFile(
      org,
      fileName,
      filePath,
      originalName
    );
    // a list, so parallel uploads of the same session can't overwrite each other
    await ioRedis.rpush(`uploadSessionMedia:${sessionId}`, media.id);
    await ioRedis.expire(`uploadSessionMedia:${sessionId}`, 3600);
    return media;
  }

  async getUploadSession(org: string, sessionId: string) {
    await this.checkUploadSession(org, sessionId);
    const list = await ioRedis.lrange(`uploadSessionMedia:${sessionId}`, 0, -1);
    return (
      await Promise.all(
        list.map((id) => this._mediaRepository.getMediaStatus(org, id))
      )
    ).filter((f) => f);
  }

  async getMediaStatus(org: string, id: string) {
    const media = await this._mediaRepository.getMediaStatus(org, id);
    if (!media) {
      throw new HttpException('Media not found', 404);
    }

    return media;
  }

  // The normalized file overwrites the original in place; only a container
  // change (mov -> mp4, jpeg -> jpg) lands under a new key. Either way the
  // polling side needs nothing but the media record to know where it is
  private normalizedName(name: string) {
    const ext = extname(name).toLowerCase();
    return `${name.slice(0, -ext.length)}.${PROCESSABLE[ext].ext}`;
  }

  // Returns the processor job id; when this process has nothing to run the
  // media (already marked processing by the upload) is released as ready, so
  // a worker without the processor configured never leaves an upload hanging
  async submitProcessing(mediaId: string) {
    const media = await this._mediaRepository.getMediaById(mediaId);
    if (!media) {
      return null;
    }

    const processable = PROCESSABLE[extname(media.name).toLowerCase()];
    if (
      !this.processor ||
      !processable ||
      !this.storage.signDownloadUrl ||
      !this.storage.signUploadUrl
    ) {
      await this.releaseUnprocessed(media.organizationId, media.id, media.name);
      return null;
    }

    const outputName = this.normalizedName(media.name);
    return this.processor.submit({
      version: 1,
      type: processable.type,
      reference: media.id,
      source: { url: await this.storage.signDownloadUrl(media.name) },
      output: {
        url: await this.storage.signUploadUrl(
          outputName,
          processable.contentType
        ),
        content_type: processable.contentType,
      },
      rules: processable.type === 'video' ? VIDEO_RULES : IMAGE_RULES,
      limits: LIMITS,
    });
  }

  // Returns true once the record is final. A transport error throws so the
  // activity retries the poll; a terminal answer from the queue or the service
  // marks the media failed and keeps the original usable
  async checkProcessing(mediaId: string, jobId: string) {
    const media = await this._mediaRepository.getMediaById(mediaId);
    if (!media) {
      return true;
    }

    // a retried activity after the record was already finalized must not
    // derive the output key a second time from the rewritten name
    if (media.status !== 'processing') {
      return true;
    }

    const org = media.organizationId;
    if (!this.processor) {
      await this.releaseUnprocessed(org, mediaId, media.name);
      return true;
    }

    const job = await this.processor.status(jobId);
    if (job.status === 'pending') {
      return false;
    }

    if (job.status === 'failed') {
      await this._mediaRepository.finishProcessing(org, mediaId, {
        error: job.error,
      });
      return true;
    }

    const { result } = job;
    if (
      !result ||
      !['completed', 'unchanged', 'failed'].includes(result.status)
    ) {
      await this._mediaRepository.finishProcessing(org, mediaId, {
        error: `Unexpected processor result: ${JSON.stringify(result).slice(
          0,
          500
        )}`,
      });
      return true;
    }

    if (result.status === 'failed') {
      // the stderr tail is the only way to know what ffmpeg objected to
      await this._mediaRepository.finishProcessing(org, mediaId, {
        error: [
          `${result.failure?.code || 'FAILED'}: ${
            result.failure?.message || ''
          }`,
          result.failure?.stderr_tail,
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 4000),
      });
      return true;
    }

    if (result.status === 'unchanged') {
      await this._mediaRepository.finishProcessing(org, mediaId, {});
      return true;
    }

    const outputName = this.normalizedName(media.name);
    await this._mediaRepository.finishProcessing(org, mediaId, {
      name: outputName,
      path: media.path.slice(0, media.path.lastIndexOf('/') + 1) + outputName,
      fileSize: result.output?.bytes,
    });

    // a same-key output already replaced the original; a stray object after a
    // container change is harmless, so a failed delete never fails the media
    if (outputName !== media.name) {
      try {
        await this.storage.removeFile(media.name);
      } catch (err) {
        console.error(`Could not remove original media ${media.name}:`, err);
      }
    }
    return true;
  }

  async failProcessing(mediaId: string, error: string) {
    const media = await this._mediaRepository.getMediaById(mediaId);
    if (!media) {
      return;
    }

    return this._mediaRepository.finishProcessing(
      media.organizationId,
      mediaId,
      {
        error,
      }
    );
  }

  getMedia(org: string, page: number, search?: string) {
    return this._mediaRepository.getMedia(org, page, search);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideoAllowed(org: Organization, type: string) {
    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  private async validateVideoRequest(org: Organization, body: VideoDto) {
    const totalCredits = await this._subscriptionService.checkCredits(
      org,
      'ai_videos'
    );

    if (totalCredits.credits <= 0) {
      throw new SubscriptionException({
        action: AuthorizationActions.Create,
        section: Sections.VIDEOS_PER_MONTH,
      });
    }

    const video = this._videoManager.getVideoByName(body.type);
    if (!video) {
      throw new Error(`Video type ${body.type} not found`);
    }

    if (!video.trial && org.isTrailing) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    await video.instance.processAndValidate(body.customParams);
    return video;
  }

  async generateVideo(org: Organization, body: VideoDto) {
    try {
      const video = await this.validateVideoRequest(org, body);

      return await this._subscriptionService.useCredit(
        org,
        'ai_videos',
        async () => {
          const loadedData = await video.instance.process(
            body.output,
            body.customParams
          );

          const file = await this.storage.uploadSimple(loadedData);
          return this.saveFile(org.id, file.split('/').pop(), file);
        }
      );
    } catch (err) {
      throw generationError(err);
    }
  }

  // Generating a video takes minutes, longer than an MCP request can stay open,
  // so the generation runs in a workflow and the caller polls its status by job id
  async startGenerateVideo(org: Organization, body: VideoDto) {
    // validated here as well as in the workflow so bad input fails before a job exists
    try {
      await this.validateVideoRequest(org, body);
    } catch (err) {
      throw generationError(err);
    }

    const client = this._temporalService.client.getRawClient();
    if (!client) {
      throw new HttpException('Video generation is not available', 503);
    }

    const jobId = `video_${org.id}_${makeId(10)}`;
    await client.workflow.start('generateVideoWorkflow', {
      workflowId: jobId,
      taskQueue: 'main',
      args: [
        {
          organizationId: org.id,
          body,
        },
      ],
      typedSearchAttributes: new TypedSearchAttributes([
        {
          key: organizationId,
          value: org.id,
        },
      ]),
    });

    return { jobId };
  }

  async getGenerateVideoStatus(
    org: Organization,
    jobId: string
  ): Promise<{
    status: 'pending' | 'completed' | 'failed';
    id?: string;
    path?: string;
    error?: string;
  }> {
    // the job id carries the organization, so one org can't poll another's job
    if (!jobId.startsWith(`video_${org.id}_`)) {
      throw new HttpException('Video job not found', 404);
    }

    const handle = await this._temporalService.client.getWorkflowHandle(jobId);
    let status: string;
    try {
      status = (await handle.describe()).status.name;
    } catch (err) {
      throw new HttpException('Video job not found', 404);
    }

    if (status === 'RUNNING') {
      return { status: 'pending' };
    }

    try {
      const media = (await handle.result()) as Awaited<
        ReturnType<MediaService['saveFile']>
      >;
      return { status: 'completed', id: media.id, path: media.path };
    } catch (err) {
      // the workflow failure wraps the activity failure which wraps the actual error
      let cause: any = err;
      while (cause?.cause && cause.cause !== cause) {
        cause = cause.cause;
      }
      return {
        status: 'failed',
        error: cause?.message || String(err),
      };
    }
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (
      typeof functionToCall !== 'function' ||
      this._videoManager.checkAvailableVideoFunction(functionToCall)
    ) {
      throw new HttpException(
        `Function ${functionName} not found on video instance`,
        400
      );
    }

    return functionToCall(body);
  }
}
