import { Injectable } from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {StarsService} from "@gitroom/nestjs-libraries/database/prisma/stars/stars.service";
import {BullMqClient} from "@gitroom/nestjs-libraries/bullmq-transport/bullmq-client";
import {WorkerServiceProducer} from "@gitroom/nestjs-libraries/bullmq-transport/bullmq-register";

@Injectable()
export class CheckStars {
    constructor(
        private _starsService: StarsService,
        @WorkerServiceProducer() private _workerServiceProducer: BullMqClient
    ) {
    }
    @Cron('0 0 * * *')
    async checkStars() {
        const allGitHubRepositories = await this._starsService.getAllGitHubRepositories();
        for (const repository of allGitHubRepositories) {
           this._workerServiceProducer.emit('check_stars', JSON.stringify({login: repository.login}));
        }
    }
}