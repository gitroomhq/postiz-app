import { Injectable } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';
import { SaveMediaInformationDto } from '@gitroom/nestjs-libraries/dtos/media/save.media.information.dto';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { AuthorizationActions, Sections, SubscriptionException } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@Injectable()
export class MediaService {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService,
    private _videoManager: VideoManager
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
    if (generatePromptFirst) {
      prompt = await this._openAi.generatePromptForPicture(prompt);
      console.log('Prompt:', prompt);
    }
    const image = await this._openAi.generateImage(
      prompt,
      !!generatePromptFirst
    );
    await this._subscriptionService.useCredit(org);
    return image;
  }

  saveFile(org: string, fileName: string, filePath: string) {
    return this._mediaRepository.saveFile(org, fileName, filePath);
  }

  getMedia(org: string, page: number) {
    return this._mediaRepository.getMedia(org, page);
  }

  saveMediaInformation(org: string, data: SaveMediaInformationDto) {
    return this._mediaRepository.saveMediaInformation(org, data);
  }

  getVideoOptions() {
    return this._videoManager.getAllVideos();
  }

  async generateVideo(org: Organization, body: VideoDto, type: string) {
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

    const video = this._videoManager.getVideoByName(type);
    if (!video) {
      throw new Error(`Video type ${type} not found`);
    }

    const loadedData = await video.instance.process(
      body.prompt,
      body.output,
      body.customParams
    );

    const file = await this.storage.uploadSimple(loadedData);
    const save = await this.saveFile(org.id, file.split('/').pop(), file);

    await this._subscriptionService.useCredit(org, 'ai_videos');

    return save;
  }

  async videoFunction(identifier: string, functionName: string, body: any) {
    const video = this._videoManager.getVideoByName(identifier);
    if (!video) {
      throw new Error(`Video with identifier ${identifier} not found`);
    }

    // @ts-ignore
    const functionToCall = video.instance[functionName];
    if (typeof functionToCall !== 'function') {
      throw new Error(`Function ${functionName} not found on video instance`);
    }

    return functionToCall(body);
  }
}
