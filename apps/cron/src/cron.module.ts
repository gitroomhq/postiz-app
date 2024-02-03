import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import {CheckTrending} from "./tasks/check.trending";

@Module({
    imports: [ScheduleModule.forRoot()],
    controllers: [],
    providers: [CheckTrending],
})
export class CronModule {}
