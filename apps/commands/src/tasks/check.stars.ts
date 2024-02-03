import {Command, Positional} from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import {BullMqClient} from "@gitroom/nestjs-libraries/bull-mq-transport/client/bull-mq.client";
import * as console from "console";

@Injectable()
export class CheckStars {
    constructor(
        private _workerServiceProducer: BullMqClient
    ) {
    }
    @Command({
        command: 'sync:stars <login>',
        describe: 'Sync stars for a login',
    })
    async create(
        @Positional({
            name: 'login',
            describe: 'login {owner}/{repo}',
            type: 'string'
        })
            login: string,
    ) {
        this._workerServiceProducer.emit('check_stars', {payload: {login}}).subscribe();
        return true;
    }
}