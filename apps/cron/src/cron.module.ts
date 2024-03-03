import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {RefreshTokens} from "@gitroom/cron/tasks/refresh.tokens";
import {CheckStars} from "@gitroom/cron/tasks/check.stars";

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [],
    providers: [RefreshTokens, CheckStars],
})
export class CronModule {}
