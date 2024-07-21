import {Injectable} from "@nestjs/common";
import {MediaRepository} from "@gitroom/nestjs-libraries/database/prisma/media/media.repository";
import { OpenaiService } from '@gitroom/nestjs-libraries/openai/openai.service';

@Injectable()
export class MediaService {
    constructor(
        private _mediaRepository: MediaRepository,
        private _openAi: OpenaiService
    ){}

    generateImage(prompt: string) {
        return this._openAi.generateImage(prompt);
    }

    saveFile(org: string, fileName: string, filePath: string) {
        return this._mediaRepository.saveFile(org, fileName, filePath);
    }

    getMedia(org: string, page: number) {
        return this._mediaRepository.getMedia(org, page);
    }
}