import {PrismaRepository} from "@gitroom/nestjs-libraries/database/prisma/prisma.service";
import {Injectable} from "@nestjs/common";

@Injectable()
export class StarsRepository {
    constructor(
        private _github: PrismaRepository<'gitHub'>
    ) {
    }

    getAllGitHubRepositories() {
        return this._github.model.gitHub.findMany({
            distinct: ['login'],
        });
    }
}