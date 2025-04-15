import { Injectable } from '@nestjs/common';
import { MediaRepository } from '@gitroom/nestjs-libraries/database/prisma/media/media.repository';
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';
import { Organization } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private _mediaRepository: MediaRepository,
    private _openAi: OpenaiService,
    private _subscriptionService: SubscriptionService
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
}
