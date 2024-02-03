import {Injectable} from "@nestjs/common";
import {StarsRepository} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.repository";

@Injectable()
export class StarsService {
    constructor(
        private _starsRepository: StarsRepository
    ){}

    getAllGitHubRepositories() {
        return this._starsRepository.getAllGitHubRepositories();
    }
}