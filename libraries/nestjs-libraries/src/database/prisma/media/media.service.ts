import {Injectable} from "@nestjs/common";
import {MediaRepository} from "@gitroom/nestjs-libraries/database/prisma/media/media.repository";

@Injectable()
export class MediaService {
    constructor(
        private _mediaRepository: MediaRepository
    ){}

    saveFile(org: string, fileName: string, filePath: string) {
        return this._mediaRepository.saveFile(org, fileName, filePath);
    }

    getMedia(org: string, page: number) {
        return this._mediaRepository.getMedia(org, page);
    }
}