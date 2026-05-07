import { HttpException, Injectable, Logger } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
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
import {
  AiAspectRatio,
  AiImageService,
} from '@gitroom/nestjs-libraries/ai/ai-image.service';
import { AiTextService } from '@gitroom/nestjs-libraries/ai/ai-text.service';
import {
  AiVideoService,
  GenerateVideoInput,
} from '@gitroom/nestjs-libraries/ai/ai-video.service';

@Injectable()
export class MediaService {
  private readonly _logger = new Logger(MediaService.name);
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager,
    private _aiImageService: AiImageService,
    private _aiTextService: AiTextService,
    private _aiVideoService: AiVideoService
  ) {}

  async deleteMedia(org: string, id: string, profileId?: string) {
    return this._mediaRepository.deleteMedia(org, id, profileId);
  }

  getMediaById(id: string) {
    return this._mediaRepository.getMediaById(id);
  }

  async generateImage(
    prompt: string,
    org: Organization,
    generatePromptFirst?: boolean,
    profileId?: string,
    aspectRatio?: AiAspectRatio
  ) {
    const generating = await this._subscriptionService.useCredit(
      org,
      'ai_images',
      async () => {
        let finalPrompt = prompt;
        // Enrichment do prompt e best-effort: se a credencial de TEXT
        // nao estiver configurada (412), seguimos com o prompt original.
        // Sem isso, configurar so IMAGE em Settings > AI Provider quebrava
        // a geracao com erro 412 mesmo a chave de imagem estando OK.
        if (generatePromptFirst) {
          try {
            finalPrompt = await this._aiTextService.generatePromptForPicture(
              org.id,
              prompt,
              profileId
            );
          } catch (e) {
            const status =
              e instanceof HttpException ? e.getStatus() : undefined;
            if (status === 412) {
              this._logger.warn(
                'TEXT credential nao configurada, seguindo com prompt original sem enrichment'
              );
            } else {
              throw e;
            }
          }
        }
        const result = await this._aiImageService.generate(
          org.id,
          finalPrompt,
          profileId,
          aspectRatio ? { aspectRatio } : undefined
        );
        return result.base64;
      }
    );

    return generating;
  }

  saveFile(org: string, fileName: string, filePath: string, originalName?: string, profileId?: string) {
    return this._mediaRepository.saveFile(org, fileName, filePath, originalName, profileId);
  }

  getMedia(org: string, page: number, profileId?: string) {
    return this._mediaRepository.getMedia(org, page, profileId);
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

    if (!video.trial && org.isTrailing && process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    return true;
  }

  async generateVideo(org: Organization, body: VideoDto) {
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

    if (!video.trial && org.isTrailing && process.env.STRIPE_PUBLISHABLE_KEY) {
      throw new HttpException('This video is not available in trial mode', 406);
    }

    console.log(body.customParams);
    await video.instance.processAndValidate(body.customParams);
    console.log('no err');

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
  }

  /**
   * Geracao de video via Kie.ai (Seedance/Veo) — fluxo novo do AI Provider
   * System. Diferente de `generateVideo()` que usa o VideoManager legado
   * (HeyGen, ImagesSlides etc), este metodo:
   *  - Resolve credencial via AiVideoService (provider=kieai, modelo
   *    escolhido em Settings).
   *  - Usa polling de 30s (max 10min) — bloqueia a request, mas e a melhor
   *    opcao MVP sem expor webhook publico.
   *  - Faz uploadSimple do URL hospedado pelo kie.ai para storage propria
   *    (R2/local) imediatamente para evitar expirar.
   *  - Decrementa credito ai_videos via useCredit.
   *
   * Reusado pelo controller `/ai/video/generate` e pelo MCP tool
   * `generateVideoTool` do agente.
   */
  async generateAiVideo(
    org: Organization,
    input: GenerateVideoInput,
    profileId?: string
  ) {
    return this._subscriptionService.useCredit(
      org,
      'ai_videos',
      async () => {
        const generated = await this._aiVideoService.generate(
          org.id,
          input,
          profileId
        );

        const file = await this.storage.uploadSimple(generated.url);
        if (!file) {
          throw new HttpException(
            'Falha ao baixar video do kie.ai para storage proprio.',
            502
          );
        }

        const fileName = file.split('/').pop() ?? 'video.mp4';
        return this.saveFile(org.id, fileName, file, undefined, profileId);
      },
      profileId
    );
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
